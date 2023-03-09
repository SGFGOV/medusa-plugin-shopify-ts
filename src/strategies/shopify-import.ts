import {
  AbstractBatchJobStrategy,
  BatchJobService,
  BatchJobStatus,
  Product,
  ProductService,
  ProductStatus,
  StoreService,
} from "@medusajs/medusa";
import { Logger } from "@medusajs/medusa/dist/types/global";
import {
  ShopifyCollection,
  ShopifyCollections,
  ShopifyData,
  ShopifyImportRequest,
  ShopifyJobResult,
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
  productService: ProductService;
  storeService: StoreService;
  logger: Logger;
}

class ShopifyImportStrategy extends AbstractBatchJobStrategy {
  collects: ShopifyCollections;
  buildTemplate(): Promise<string> {
    throw new Error("Method not implemented.");
  }
  protected batchJobService_: BatchJobService;
  protected shopifyService_: ShopifyService;
  static identifier = "shopify-import-strategy";
  static batchType = "shopify-import";
  productService_: ProductService;
  storeService: StoreService;
  logger: Logger;
  resolvedProducts: Product[];

  constructor(container: ShopifyImportStrategyProps) {
    super(container);
    this.batchJobService_ = container.batchJobService;
    this.shopifyService_ = container.shopifyService;
    this.productService_ = container.productService;
    this.storeService = container.storeService;
    this.logger = container.logger;
    this.resolvedProducts = [];
  }

  async processJob(batchJobId: string): Promise<void> {
    const batch = await this.batchJobService_.retrieve(batchJobId);
    if (batch.status == BatchJobStatus.COMPLETED) {
      return;
    }
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
      const jobResult: ShopifyJobResult = {
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
  ): Promise<ShopifyData[] | ShopifyData[][] | Product[]> {
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
        return await this.processCollectionTypes(
          shopifyData as ShopifyCollections,
          shopifyImportRequest,
          path
        );
      case "collects":
        this.collects = shopifyData as ShopifyCollections;
        return this.collects;
    }
  }

  async processCollectionTypes(
    theCollections: ShopifyCollections,
    shopifyImportRequest: ShopifyImportRequest,
    collectionType: "smart_collections" | "custom_collections"
  ): Promise<ShopifyCollections | ShopifyCollections[]> {
    const rawProductsFromBatches = await this.awaitPathCompletion(
      shopifyImportRequest,
      "products"
    );
    this.logger.info(`Retrived products from ${rawProductsFromBatches.length}`);
    const importedProductDataFromBatchResult: ShopifyProducts = [];
    rawProductsFromBatches.map((r, index) => {
      if (r && r?.shopifyData) {
        importedProductDataFromBatchResult.push(
          ...(r.shopifyData as ShopifyProducts)
        );
      } else {
        this.logger.warn(`no data in batch ${index}`);
      }
    });
    const retrievedProductPromises = importedProductDataFromBatchResult.map(
      async (product) => {
        try {
          return await this.productService_.retrieveByExternalId(
            product.external_id as string
          );
        } catch (e) {
          this.logger.error(`${JSON.stringify(e)}`);
          return;
        }
      }
    );
    this.resolvedProducts = await Promise.all(retrievedProductPromises);
    this.collects = [];
    (await this.awaitPathCompletion(shopifyImportRequest, "collects")).map(
      (p) => {
        this.collects.push(...(p.shopifyData as ShopifyCollections));
      }
    );

    const vendors = [
      ...new Set(
        this.resolvedProducts.map((product) => {
          return product.metadata.vendor as string;
        })
      ),
    ];
    if (this.shopifyService_.options.enable_vendor_store) {
      const result = vendors.map(async (vendor) => {
        const storeId = await this.fetchStore(vendor);
        const storeProducts = this.resolvedProducts.filter((product) => {
          return product.metadata.vendor == vendor;
        });
        const storeCollectionResult =
          await this.addProductsToMedusaStoreCollection(
            collectionType,
            storeId,
            theCollections,
            storeProducts
          );
        return storeCollectionResult;
      });
      return Promise.all(result);
    } else {
      const storeId = await this.fetchStore();
      const storeCollectionResult =
        await this.addProductsToMedusaStoreCollection(
          collectionType,
          storeId,
          theCollections,
          this.resolvedProducts
        );
      return storeCollectionResult;
    }
  }

  async addProductsToMedusaStoreCollection(
    collectionType: string,
    storeId: string,
    theCollection: ShopifyCollections,
    products
  ): Promise<ShopifyCollections> {
    switch (collectionType) {
      case "custom_collections":
        return await this.atomicPhase_(async (transactionManager) => {
          return await this.shopifyService_.shopifyCollectionService_
            .withTransaction(transactionManager)
            .createCustomCollections(
              this.collects,
              theCollection,
              products,
              storeId
            );
        });
      case "smart_collections":
        return await this.atomicPhase_(async (transactionManager) => {
          return await await this.shopifyService_.shopifyCollectionService_
            .withTransaction(transactionManager)
            .createSmartCollections(theCollection, products, storeId);
        });
    }
  }

  async fetchStore(vendor?: string): Promise<string> {
    let store_id: string;

    if (this.shopifyService_.options.enable_vendor_store) {
      try {
        const vendorStore = await this.shopifyService_.getStoreByName(vendor);
        store_id = vendorStore.id;
      } catch (e) {
        this.logger.warn(`${vendor} store doesn't exist`);
      }

      if (!store_id && this.shopifyService_.options.auto_create_store) {
        let store = await this.storeService.create();
        store = await this.storeService.update({
          name: vendor,
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
        await this.shopifyService_.getStoreByName(
          this.shopifyService_.options.default_store_name
        )
      ).id;
    }
    return store_id;
  }

  async awaitPathCompletion(
    shopifyImportRequest: ShopifyImportRequest,
    path: ShopifyPath
  ): Promise<ShopifyJobResult[]> {
    const pathObjects = [];

    let recievedPathEntries = [];
    while (recievedPathEntries.length == 0) {
      /** current request */
      const batchPaths = await this.shopifyService_.getBatchTasks(
        shopifyImportRequest.requestId
      );
      recievedPathEntries = batchPaths?.filter((batchPath) => {
        return batchPath.path == path;
      });
      if (!recievedPathEntries) {
        /** some batches may havebeen completed in an earlier request */
        return await this.fetchCompletedJobResults(path);
      }
      if (recievedPathEntries.length > 0) {
        break;
      }
      if (recievedPathEntries.length == 0) {
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
            return job.result as ShopifyJobResult;
          } else {
            await sleep(1000);
          }
        }
      });
      const allProducts = await Promise.all(result);

      return allProducts;
    });
  }
  async fetchCompletedJobResults(path: string): Promise<ShopifyJobResult[]> {
    const completedBatches = await this.batchJobService_.listAndCount(
      {
        type: [ShopifyImportStrategy.batchType],
      },
      {
        take: 1e9,
      }
    );
    const retrievedBatchJobList = completedBatches[0];
    const completedJobsResultOfInterest = retrievedBatchJobList.filter(
      (job) =>
        job.context.path == path && job.status == BatchJobStatus.COMPLETED
    );

    return completedJobsResultOfInterest.map((job) => {
      const result: ShopifyJobResult = job.result as ShopifyJobResult;
      return result;
    });
  }

  async processProducts(
    products: ShopifyProducts,
    shopifyImportRequest: ShopifyImportRequest
  ): Promise<Product[]> {
    return await this.atomicPhase_(async (transactionManager) => {
      const max_products = shopifyImportRequest.shopify_product_ids
        ? Math.min(
            shopifyImportRequest.shopify_product_ids?.length ?? Infinity,
            shopifyImportRequest.max_num_products ?? Infinity,
            products.length
          )
        : Math.min(
            shopifyImportRequest.max_num_products ?? Infinity,
            products.length
          );

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
        const store_id = await this.fetchStore(product.vendor);

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

      this.logger.info(`Pre processed shopify data  job id: ${batchJob.id}`);

      await this.batchJobService_
        .withTransaction(transactionManager)
        .update(batchJob, {
          result: {
            stat_descriptors: [
              {
                key: "shopify-import-status",
                name: "Batch being currently processed",
                message: `The batch ${batchJob.id} is under pre processing`,
              },
            ],
          },
        });
    });
  }
}

export default ShopifyImportStrategy;
