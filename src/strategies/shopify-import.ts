import {
  AbstractBatchJobStrategy,
  BatchJobService,
  BatchJobStatus,
  ProductService,
  ProductStatus,
  StoreService,
} from "@medusajs/medusa";
import { Logger } from "@medusajs/medusa/dist/types/global";
import {
  ShopifyCollections,
  ShopifyData,
  ShopifyImportRequest,
  ShopifyJobResultType,
  ShopifyPath,
  ShopifyProducts,
} from "../interfaces/shopify-interfaces";
import ShopifyService from "../services/shopify";
import ShopifyCollectionService from "../services/shopify-collection";
import ShopifyProductService from "../services/shopify-product";
import { EntityManager } from "typeorm";
import { sleep } from "@medusajs/medusa/dist/utils/sleep";
import { UpdateStoreInput } from "@medusajs/medusa/dist/types/store";

export interface ShopifyImportStrategyProps {
  batchJobService: BatchJobService;
  shopifyProductService: ShopifyProductService;
  shopifyCollectionService: ShopifyCollectionService;
  shopifyService: ShopifyService;
  storeService: StoreService;
  logger: Logger;
}

class ShopifyImportStrategy extends AbstractBatchJobStrategy {
  collects: any;
  buildTemplate(): Promise<string> {
    throw new Error("Method not implemented.");
  }
  protected manager_: EntityManager;
  protected transactionManager_: EntityManager;
  protected batchJobService_: BatchJobService;
  protected shopifyService_: ShopifyService;
  static identifier = "shopify-import-strategy";
  static batchType = "shopify-import";
  productService_: ProductService;
  storeService: StoreService;
  logger: Logger;
  resolvedProducts: ShopifyProducts;

  constructor(container: ShopifyImportStrategyProps) {
    super(container);
    this.batchJobService_ = container.batchJobService;
    this.shopifyService_ = container.shopifyService;
    this.storeService = container.storeService;
    this.logger = container.logger;
  }

  async processJob(batchJobId: string): Promise<void> {
    const batch = await this.batchJobService_.retrieve(batchJobId);
    const retrievedShopifyData = batch.context.shopifyData as ShopifyData[];

    const shopifyImportRequest = batch.context
      .shopifyImportRequest as ShopifyImportRequest;

    const path = batch.context["path"] as ShopifyPath;

    const result = await this.processShopifyPageData(
      retrievedShopifyData,
      shopifyImportRequest,
      path
    );

    return await this.atomicPhase_(async (transactionManager) => {
      const jobResult: ShopifyJobResultType = {
        advancement_count: retrievedShopifyData.length,
        shopifyData: result,
        path: path,
      };
      await this.batchJobService_
        .withTransaction(transactionManager)
        .update(batchJobId, {
          result: jobResult,
        });
    });
  }
  async processShopifyPageData(
    shopifyData: ShopifyData[],
    shopifyImportRequest: ShopifyImportRequest,
    path: string
  ): Promise<ShopifyData[]> {
    if (!shopifyData?.length) {
      return;
    }

    switch (path) {
      case "products":
        return await this.processProducts(
          shopifyData as ShopifyProducts,
          shopifyImportRequest
        );
      case "smart_collections":
      case "custom_collections":
        return await this.processCollectionType(
          shopifyData,
          shopifyImportRequest,
          path
        );
      case "collects":
        this.collects = shopifyData as ShopifyCollections;
        return this.collects;
    }
  }

  async processCollectionType(
    theCollection: ShopifyData[],
    shopifyImportRequest: ShopifyImportRequest,
    collectionType: "smart_collections" | "custom_collections"
  ): Promise<ShopifyCollections> {
    const products = await this.awaitPathCompletion(
      shopifyImportRequest,
      "products"
    );
    this.resolvedProducts = products;
    this.collects = await this.awaitPathCompletion(
      shopifyImportRequest,
      "collects"
    );
    switch (collectionType) {
      case "custom_collections":
        return await this.atomicPhase_(async (transactionManager) => {
          return await this.shopifyService_.shopifyCollectionService_
            .withTransaction(transactionManager)
            .createCustomCollections(this.collects, theCollection, products);
        });
      case "smart_collections":
        return await this.atomicPhase_(async (transactionManager) => {
          return await await this.shopifyService_.shopifyCollectionService_
            .withTransaction(transactionManager)
            .createSmartCollections(theCollection, products);
        });
    }
  }

  async awaitPathCompletion(
    shopifyImportRequest: ShopifyImportRequest,
    path: ShopifyPath
  ): Promise<any> {
    let pathObjects = [];

    let recievedPathEntries = [];
    while (recievedPathEntries.length == 0) {
      const batchPaths = await this.shopifyService_.getBatchTasks(
        shopifyImportRequest.requestId
      );
      recievedPathEntries = batchPaths.filter((batchPath) => {
        return batchPath.path == path;
      });
      if (recievedPathEntries.length > 0) {
        break;
      }
      await sleep(3000);
    }
    return await this.atomicPhase_(async (transactionManager) => {
      const result = recievedPathEntries.map(async (batchPath) => {
        let status = undefined;
        while (status != BatchJobStatus.COMPLETED) {
          const job = await this.batchJobService_
            .withTransaction(transactionManager)
            .retrieve(batchPath.batchJobId);
          status = job.status;
          if (status == BatchJobStatus.COMPLETED) {
            return job.result as ShopifyJobResultType;
          } else {
            await sleep(1000);
          }
        }
      });
      const allProducts = await Promise.all(result);
      allProducts.map((shopifyBatchPath) => {
        pathObjects = pathObjects.concat(shopifyBatchPath.shopifyData);
      });

      return pathObjects;
    });
  }

  async processProducts(
    products: ShopifyProducts,
    shopifyImportRequest: ShopifyImportRequest
  ): Promise<ShopifyProducts> {
    return await this.atomicPhase_(async (transactionManager) => {
      const max_products = shopifyImportRequest.shopify_product_ids
        ? Math.min(
            shopifyImportRequest.shopify_product_ids?.length,
            shopifyImportRequest.max_num_products,
            products.length
          )
        : Math.min(shopifyImportRequest.max_num_products, products.length);

      for (
        let productInputListCount = 0, productCreateCount = 0;
        productInputListCount < products?.length &&
        productCreateCount < max_products;
        productInputListCount++
      ) {
        const product = products[productInputListCount];
        this.logger.info(
          `creating product  ${productInputListCount}` +
            `/${products.length} ${products[productInputListCount].handle}`
        );
        if (
          shopifyImportRequest.shopify_product_ids &&
          shopifyImportRequest.shopify_product_ids.indexOf("" + product.id) < 0
        ) {
          this.logger.warn(
            `${product.id} not found in product id's retrieved from shopify`
          );
          continue;
        }
        let store_id: string;
        const default_store_name = shopifyImportRequest.default_store_name;
        if (this.shopifyService_.options.enable_vendor_store) {
          try {
            const vendorStore = await this.shopifyService_.getStoreByName(
              product.vendor
            );
            store_id = vendorStore.id;
          } catch (e) {
            this.logger.warn(`${product.vendor} store doesn't exist`);
          }

          if (!store_id && this.shopifyService_.options.auto_create_store) {
            let store = await this.storeService.create();
            store = await this.storeService.update({
              name: product.vendor,
              id: store.id,
            } as any);
            store_id = store.id;
          } else {
            throw new Error(
              "trying to import products for a vendor who isn't available"
            );
          }
        } else {
          store_id = (
            await this.shopifyService_.getStoreByName(default_store_name)
          ).id;
        }
        const result = await this.shopifyService_.shopifyProductService_
          .withTransaction(transactionManager)
          .create(product, store_id);
        if (result) {
          productCreateCount++;
        }
        if (this.resolvedProducts) {
          this.resolvedProducts.push(result);
        } else {
          this.resolvedProducts = [result];
        }
      }
      return this.resolvedProducts;
    });
  }

  async preProcessBatchJob(batchJobId: string): Promise<void> {
    return await this.atomicPhase_(async (transactionManager) => {
      const batchJob = await this.batchJobService_
        .withTransaction(transactionManager)
        .retrieve(batchJobId);

      const count = await this.shopifyService_.lastFetchedProducts?.length
        .withTransaction(transactionManager)
        .count({
          status: ProductStatus.PROPOSED,
        });

      await this.batchJobService_
        .withTransaction(transactionManager)
        .update(batchJob, {
          result: {
            advancement_count: 0,
            count,
            stat_descriptors: [
              {
                key: "shopify-import-count",
                name: "Number of products to imported",
                message: `${count} product(s) will be imported.`,
              },
            ],
          },
        });
    });
  }
}

export default ShopifyImportStrategy;
