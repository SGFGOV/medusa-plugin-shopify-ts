/* eslint-disable valid-jsdoc */
import {
  ShippingProfileService,
  Store,
  StoreService,
  TransactionBaseService,
} from "@medusajs/medusa";
import { Logger } from "@medusajs/medusa/dist/types/global";
import {
  ClientOptions,
  ShopifyFetchRequest,
  ShopifyImportRequest,
} from "interfaces/interfaces";
import { BaseService } from "medusa-interfaces";
import { EntityManager } from "typeorm";
import { INCLUDE_PRESENTMENT_PRICES } from "../utils/const";
import ShopifyClientService from "./shopify-client";
import ShopifyCollectionService from "./shopify-collection";
import ShopifyProductService from "./shopify-product";

export interface ShopifyServiceParams {
  manager_: EntityManager;
  shippingProfileService: ShippingProfileService;
  storeService: StoreService;
  shopifyProductService: ShopifyProductService;
  shopifyCollectionService: ShopifyCollectionService;
  shopifyClientService: ShopifyClientService;
  logger: Logger;
}

class ShopifyService extends TransactionBaseService {
  protected manager_: EntityManager;
  protected transactionManager_: EntityManager;
  options: ClientOptions;
  shippingProfileService_: ShippingProfileService;
  shopifyProductService_: ShopifyProductService;
  shopifyCollectionService_: ShopifyCollectionService;
  defaultClient_: ShopifyClientService;
  store_: StoreService;
  logger: Logger;
  buildService_: any;
  constructor(container: ShopifyServiceParams, options) {
    super(container);

    this.options = options;

    /** @private @const {EntityManager} */
    this.manager_ = container.manager_;
    /** @private @const {ShippingProfileService} */
    this.shippingProfileService_ = container.shippingProfileService;
    /** @private @const {ShopifyProductService} */
    this.shopifyProductService_ = container.shopifyProductService;
    /** @private @const {ShopifyCollectionService} */
    this.shopifyCollectionService_ = container.shopifyCollectionService;
    /** @private @const {ShopifyRestClient} */
    this.defaultClient_ = container.shopifyClientService;
    /** @private @const {StoreService} */
    this.store_ = container.storeService;

    /** @private @const {Logger} */
    this.logger = container.logger;
  }

  withTransaction(transactionManager): this {
    if (!transactionManager) {
      return this;
    }

    const cloned = new ShopifyService(
      {
        manager_: transactionManager,
        shippingProfileService: this.shippingProfileService_,
        shopifyClientService: this.defaultClient_,
        shopifyProductService: this.shopifyProductService_,
        shopifyCollectionService: this.shopifyCollectionService_,
        storeService: this.store_,
        logger: this.logger,
      },
      this.options
    );

    cloned.transactionManager_ = transactionManager;

    return cloned as this;
  }

  async fetchFromShopify(shopifyFetchRequest?: ShopifyFetchRequest): Promise<{
    products: any[];
    customCollections: any[];
    smartCollections: any[];
    collects: any[];
    client: any;
  }> {
    const client_ = shopifyFetchRequest
      ? new ShopifyClientService(
          {},
          {
            domain: shopifyFetchRequest.store_domain,
            api_key: shopifyFetchRequest.api_key,
          }
        )
      : this.defaultClient_;

    const updatedSinceQuery = await this.getAndUpdateBuildTime_();

    await this.shippingProfileService_.createDefault();
    await this.shippingProfileService_.createGiftCardDefault();

    const products = await client_.list(
      "products",
      INCLUDE_PRESENTMENT_PRICES,
      updatedSinceQuery
    );

    const customCollections = await client_.list(
      "custom_collections",
      null,
      updatedSinceQuery
    );

    const smartCollections = await client_.list(
      "smart_collections",
      null,
      updatedSinceQuery
    );

    const collects = await client_.list("collects", null, updatedSinceQuery);

    return {
      products,
      customCollections,
      smartCollections,
      collects,
      client: client_,
    };
  }

  async importIntoStore(
    shopifyImportRequest: ShopifyImportRequest
  ): Promise<any> {
    const { products, customCollections, smartCollections, collects } =
      await this.fetchFromShopify();
    const max_products = Math.min(
      shopifyImportRequest?.shopify_product_ids.length,
      shopifyImportRequest?.max_num_products,
      products.length
    );
    {
      return this.atomicPhase_(
        async (manager) => {
          const resolvedProducts = [];
          for (
            let i = 0, j = 0;
            i < products?.length && j < max_products;
            i++
          ) {
            this.logger.info(
              `created product  ${i}/${products.length} ${products[i].handle}`
            );
            if (
              shopifyImportRequest.shopify_product_ids &&
              !shopifyImportRequest.shopify_product_ids.find(products[i].id)
            ) {
              continue;
            }

            const result = await this.shopifyProductService_
              .withTransaction(manager)
              .create(products[i], shopifyImportRequest.store_id);
            if (result) {
              j++;
            }
            resolvedProducts.push(result);
          }

          await this.shopifyCollectionService_
            .withTransaction(manager)
            .createCustomCollections(
              collects,
              customCollections,
              resolvedProducts
            );

          await this.shopifyCollectionService_
            .withTransaction(manager)
            .createSmartCollections(smartCollections, resolvedProducts);
        },
        this.handleError,
        this.handleWarn
      );
    }
  }
  /**
   * @deprecated
   * @returns
   */
  async importShopify(): Promise<any> {
    return this.atomicPhase_(
      async (manager) => {
        const updatedSinceQuery = await this.getAndUpdateBuildTime_();

        await this.shippingProfileService_.createDefault();
        await this.shippingProfileService_.createGiftCardDefault();

        const products = await this.defaultClient_.list(
          "products",
          INCLUDE_PRESENTMENT_PRICES,
          updatedSinceQuery
        );

        const customCollections = await this.defaultClient_.list(
          "custom_collections",
          null,
          updatedSinceQuery
        );

        const smartCollections = await this.defaultClient_.list(
          "smart_collections",
          null,
          updatedSinceQuery
        );

        const collects = await this.defaultClient_.list(
          "collects",
          null,
          updatedSinceQuery
        );
        const breakOut = 100;
        const resolvedProducts = [];
        for (let i = 0; i < products?.length && i < breakOut; i++) {
          this.logger.info(
            `created product  ${i}/${products.length} ${products[i].handle}`
          );
          const result = await this.shopifyProductService_
            .withTransaction(manager)
            .create(products[i]);
          resolvedProducts.push(result);
        }

        await this.shopifyCollectionService_
          .withTransaction(manager)
          .createCustomCollections(
            collects,
            customCollections,
            resolvedProducts
          );

        await this.shopifyCollectionService_
          .withTransaction(manager)
          .createSmartCollections(smartCollections, resolvedProducts);
      },
      this.handleError,
      this.handleWarn
    );
  }

  async getAndUpdateBuildTime_(id?: string): Promise<any> {
    let buildtime = null;
    let store: Store;
    const availableStores =
      (await this.store_.retrieve()) as unknown as Store[];
    if (availableStores.length <= 0) {
      return {};
    }

    if (id) {
      store = availableStores.filter((store) => {
        return store.id == id;
      })[0];
    }

    if (store.metadata?.source_shopify_bt) {
      buildtime = store.metadata.source_shopify_bt;
    }

    const payload = {
      metadata: {
        source_shopify_bt: new Date().toISOString(),
      },
    };

    await this.store_.update(payload);

    if (!buildtime) {
      return {};
    }

    return {
      updated_at_min: buildtime,
    };
  }
  async handleError(e): Promise<void> {
    this.logger.error("Shopify Plugin Error " + e.message);
  }

  async handleWarn(e): Promise<void> {
    this.handleWarn("Shopify Plugin Error " + e.message);
  }
}

export default ShopifyService;
