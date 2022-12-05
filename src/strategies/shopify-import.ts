import {
  AbstractBatchJobStrategy,
  BatchJobService,
  ProductService,
  ProductStatus,
  StoreService,
} from "@medusajs/medusa";
import { Logger } from "@medusajs/medusa/dist/types/global";
import {
  FetchedShopifyData,
  ShopifyCollections,
  ShopifyData,
  ShopifyImportRequest,
  ShopifyProducts,
} from "interfaces/interfaces";
import ShopifyService from "../services/shopify";
import ShopifyCollectionService from "../services/shopify-collection";
import ShopifyProductService from "../services/shopify-product";
import { EntityManager } from "typeorm";
import { MedusaError } from "medusa-core-utils";

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
  shopifyProductService_: ShopifyProductService;
  shopifyCollectionService_: ShopifyCollectionService;
  productService_: ProductService;
  storeService: StoreService;
  logger: Logger;
  resolvedProducts: ShopifyProducts;

  constructor(container: ShopifyImportStrategyProps) {
    super(container);
    this.batchJobService_ = container.batchJobService;
    this.shopifyService_ = container.shopifyService;
    this.storeService = container.storeService;
    this.shopifyProductService_ = container.shopifyProductService;
    this.shopifyCollectionService_ = container.shopifyCollectionService;
    this.logger = container.logger;
  }

  async processJob(batchJobId: string): Promise<void> {
    const batch = await this.batchJobService_.retrieve(batchJobId);
    const retrievedShopifyData = batch.context.shopifyData as ShopifyData[];

    const shopifyImportRequest = JSON.parse(
      batch.context["shopifyImportRequest"] as string
    ) as ShopifyImportRequest;

    const path = batch.context["path"] as string;

    const result = await this.processShopifyPageData(
      retrievedShopifyData,
      shopifyImportRequest,
      path
    );

    return await this.atomicPhase_(async (transactionManager) => {
      await this.batchJobService_
        .withTransaction(transactionManager)
        .update(batchJobId, {
          result: {
            advancement_count: retrievedShopifyData.length,
            data: result,
            path: path,
          },
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
        break;
      case "smart_collections":
        if (this.collects?.length == 0) {
          throw new MedusaError(
            "shopify-plugin",
            "Shopify Collections Not Fetched"
          );
        }

        return await this.processSmartCollection(shopifyData);

      case "custom_collections":
        if (this.collects?.length == 0) {
          throw new MedusaError(
            "shopify-plugin",
            "Shopify Collections Not Fetched"
          );
        }
        return await this.processCustomCollection(shopifyData);
        break;
      case "collects":
        this.collects = shopifyData as ShopifyCollections;
        return this.collects;
        break;
    }
  }

  async processCustomCollection(
    customCollections: ShopifyData[]
  ): Promise<ShopifyCollections> {
    return await this.atomicPhase_(async (transactionManager) => {
      return await this.shopifyCollectionService_
        .withTransaction(transactionManager)
        .createCustomCollections(
          this.collects,
          customCollections,
          this.resolvedProducts
        );
    });
  }

  async processSmartCollection(
    smartCollections: ShopifyData[]
  ): Promise<ShopifyCollections> {
    return await this.atomicPhase_(async (transactionManager) => {
      return await await this.shopifyCollectionService_
        .withTransaction(transactionManager)
        .createSmartCollections(smartCollections, this.resolvedProducts);
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
          store_id = (await this.shopifyService_.getStoreByName(product.vendor))
            .id;
          if (!store_id && this.shopifyService_.options.auto_create_store) {
            let store = await this.storeService.create();
            store = await this.storeService.update({
              name: product.vendor,
            });
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
        const result = await this.shopifyProductService_
          .withTransaction(transactionManager)
          .create(product, store_id);
        if (result) {
          productCreateCount++;
        }
        this.resolvedProducts.push(result);
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
