/* eslint-disable valid-jsdoc */
import {
  Product,
  ProductCollectionService,
  ProductService,
  Store,
  StoreService,
  TransactionBaseService,
} from "@medusajs/medusa";
import { ProductRepository } from "@medusajs/medusa/dist/repositories/product";
import { StoreRepository } from "@medusajs/medusa/dist/repositories/store";
import { Logger } from "@medusajs/medusa/dist/types/global";
import { ClientOptions } from "interfaces/shopify-interfaces";
import { EntityManager } from "typeorm";
import { removeIndex } from "../utils/remove-index";
import ShopifyProductService from "./shopify-product";
import { Lifetime } from "awilix";

export interface ShopifyCollectionServiceParams {
  manager: EntityManager;
  shopifyProductService: ShopifyProductService;
  productCollectionService: ProductCollectionService;
  productService: ProductService;
  storeService: StoreService;
  storeRepository: typeof StoreRepository;
  productRepository: typeof ProductRepository;
  logger: Logger;
}

class ShopifyCollectionService extends TransactionBaseService {
  static LIFE_TIME = Lifetime.TRANSIENT;
  options: ClientOptions;
  productService_: ShopifyProductService;
  collectionService_: ProductCollectionService;
  storeService_: StoreService;
  medusaProductService_: ProductService;
  productRepository_: typeof ProductRepository;
  logger: any;
  storeRepository_: typeof StoreRepository;
  constructor(container: ShopifyCollectionServiceParams, options) {
    super(container);

    this.options = options;

    /** @private @const {EntityManager} */
    this.manager_ = container.manager;
    /** @private @const {ShopifyProductService} */
    this.productService_ = container.shopifyProductService;
    /** @private @const {ProductCollectionService} */
    this.collectionService_ = container.productCollectionService;
    /** @private @const {StoreService} */
    this.storeService_ = container.storeService;
    /** @private @const {ProductService} */
    this.medusaProductService_ = container.productService;

    /** @private @const {Product} */
    this.productRepository_ = container.productRepository;
    this.storeRepository_ = container.storeRepository;
    this.logger = container.logger ?? console;
  }

  withTransaction(transactionManager: EntityManager): this {
    if (!transactionManager) {
      return this;
    }

    const cloned = new ShopifyCollectionService(
      {
        manager: transactionManager,
        shopifyProductService: this.productService_,
        productCollectionService: this.collectionService_,
        storeService: this.storeService_,
        productService: this.medusaProductService_,
        productRepository: this.productRepository_,
        storeRepository: this.storeRepository_,
        logger: this.logger,
      },
      this.options
    );

    cloned.transactionManager_ = transactionManager;

    return cloned as this;
  }

  /**
   *
   * @param {Object[]} collects
   * @param {Object[]} collections
   * @param {Object[]} products
   * @return {Promise}
   */
  async createCustomCollections(
    collects,
    collections,
    products: Product[],
    storeId?: string
  ): Promise<any> {
    return this.atomicPhase_(
      async (manager) => {
        const normalizedCollections = collections.map((c) =>
          this.normalizeCustomCollection_(c, storeId)
        );

        const result = [];
        const store = await this.getStoreByIdOrName(storeId);

        for (const nc of normalizedCollections) {
          this.logger.info(`creating/updating custom collection ${nc.handle}`);
          let collection = await this.collectionService_
            .retrieveByHandle(nc.handle)
            .catch((_) => undefined);

          if (!collection) {
            collection = await this.collectionService_
              .withTransaction(manager)
              .create(nc);
          }

          const productIds = this.getCustomCollectionProducts_(
            collection.metadata.sh_id,
            collects,
            products
          );
          this.logger.info(`adding products to  collection ${nc.handle}`);
          await this.addProductsToCollection(collection.id, productIds);
          this.logger.info(`completed processing collection ${nc.handle}`);
          result.push(collection);
        }

        return result;
      },
      this.logger.error,
      this.logger.info
    );
  }

  async createSmartCollections(collections, products, storeId): Promise<any> {
    return this.atomicPhase_(
      async (manager: EntityManager) => {
        if (!collections) {
          return Promise.resolve();
        }

        const productRepo = this.manager_.getRepository(Product);

        const ids = products.map((p) => p.id);
        const completeProducts = await productRepo.find({
          where: {
            id: ids,
          },
          relations: ["variants", "tags", "type"],
        });

        const store = await this.getStoreByIdOrName(storeId);
        const defaultCurrency = store?.default_currency ?? "INR";
        const normalizedCollections = collections.map((c) =>
          this.normalizeSmartCollection_(c, storeId)
        );

        const result = [];

        for (const nc of normalizedCollections) {
          let collection = await this.collectionService_
            .retrieveByHandle(nc.collection.handle)
            .catch((_) => undefined);
          this.logger.info(`creating/updating smart collection ${nc.handle}`);
          if (!collection) {
            collection = await this.collectionService_
              .withTransaction(manager)
              .create(nc.collection);
          }

          const validProducts = this.getValidProducts_(
            nc.rules,
            completeProducts,
            nc.disjunctive ?? false,
            defaultCurrency
          );
          this.logger.info(`adding products to  collection ${nc.handle}`);
          if (validProducts.length) {
            const productIds = validProducts.map((p) => p.id);
            await this.addProductsToCollection(collection.id, productIds);
          }

          result.push(collection);
        }

        return result;
      },
      this.logger.error,
      this.logger.info
    );
  }

  async addProductsToCollection(collectionId, productIds): Promise<any> {
    return this.atomicPhase_(
      async (manager) => {
        const result = await this.collectionService_
          .withTransaction(manager)
          .addProducts(collectionId, productIds);

        return result;
      },
      this.logger.error,
      this.logger.info
    );
  }

  getCustomCollectionProducts_(
    shCollectionId: string,
    collects,
    products: Product[]
  ): string[] {
    const medusaProductIds = products.reduce((prev, curr) => {
      if (curr.external_id) {
        prev[curr.external_id] = curr.id;
      }

      return prev;
    }, {});

    const productIds = collects.reduce((productIds, c) => {
      if (c.collection_id === shCollectionId) {
        productIds.push(`${c.product_id}`);
      }
      return productIds;
    }, []);

    const productIdsToAdd = Object.keys(medusaProductIds).map((shopifyId) => {
      if (productIds.includes(shopifyId)) {
        const medusaId = medusaProductIds[shopifyId];
        delete medusaProductIds[shopifyId];
        return medusaId;
      }
    });

    // remove added products from the array
    for (const id of productIdsToAdd) {
      const productToRemove = products.find((p) => p.id === id);
      if (productToRemove) {
        removeIndex(products, productToRemove);
      }
    }
    return productIdsToAdd.filter((p) => p != undefined);
  }

  getValidProducts_(rules, products, disjunctive, defaultCurrency): any {
    const validProducts = [];

    for (const product of products) {
      const results = rules.map((r) =>
        this.testRule_(r, product, defaultCurrency)
      );

      if (disjunctive && !results.includes(false)) {
        validProducts.push(product);
      } else if (!disjunctive && results.includes(true)) {
        validProducts.push(product);
      }
    }

    // remove valid products from the array
    for (const validProduct of validProducts) {
      removeIndex(products, validProduct);
    }

    return validProducts;
  }

  testRule_(rule, product, defaultCurrency = undefined): boolean {
    const { column, relation, condition } = rule;

    if (column === "title") {
      return this.testTextRelation_(product.title, relation, condition);
    }

    if (column === "type") {
      return this.testTextRelation_(product.type.value, relation, condition);
    }

    if (column === "vendor") {
      if (product.metadata?.vendor) {
        return this.testTextRelation_(
          product.metadata?.vendor,
          relation,
          condition
        );
      }

      return false;
    }

    if (column === "variant_title") {
      if (product.variants?.length) {
        const anyMatch = product.variants.some((variant) => {
          return this.testTextRelation_(variant.title, relation, condition);
        });

        return anyMatch;
      }

      return false;
    }

    if (column === "tag") {
      if (product.tags) {
        const anyMatch = product.tags.some((tag) =>
          this.testTextRelation_(tag.value, relation, condition)
        );

        return anyMatch;
      }

      return false;
    }

    if (column === "variant_inventory") {
      if (product.variants?.length) {
        const anyMatch = product.variants.some((variant) =>
          this.testNumberRelation_(
            variant.inventory_quantity,
            relation,
            condition
          )
        );

        return anyMatch;
      }

      return false;
    }

    if (column === "variant_price") {
      if (product.variants?.length && defaultCurrency) {
        const prices = [];

        for (const variant of product.variants) {
          if (variant.prices || variant.presentment_prices) {
            const priceStructures =
              variant.prices || variant.presentment_prices;

            for (const priceStructure of priceStructures) {
              const { price } = priceStructure;
              if (price?.currency_code) {
                if (price.currency_code === defaultCurrency) {
                  prices.push(price.amount);
                } else {
                  prices.push(price);
                }
              }
            }
          }
        }

        const anyMatch = prices.some((price) => {
          return this.testNumberRelation_(price, relation, condition);
        });

        return anyMatch;
      }

      return false;
    }

    if (column === "variant_weight") {
      if (product.variants?.length) {
        const anyMatch = product.variants.some((variant) =>
          this.testNumberRelation_(variant.weight, relation, condition)
        );

        return anyMatch;
      }

      return false;
    }

    // If we get here, it means the column is variant_compare_at_price which we don't support until we extend MoneyAmount
    return true;
  }

  testTextRelation_(text, relation, condition): boolean {
    if (relation === "contains") {
      return text.includes(condition);
    }

    if (relation === "equals") {
      return text === condition;
    }

    if (relation === "not_equals") {
      return text !== condition;
    }

    if (relation === "starts_with") {
      return text.startsWith(condition);
    }

    if (relation === "ends_with") {
      return text.endsWith(condition);
    }

    return false;
  }

  testNumberRelation_(number, relation, condition): boolean {
    if (relation === "greater_than") {
      return number > condition;
    }

    if (relation === "less_than") {
      return number < condition;
    }

    if (relation === "equals") {
      return number === condition;
    }

    if (relation === "not_equals") {
      return number !== condition;
    }

    return false;
  }

  normalizeCustomCollection_(shopifyCollection, storeId: string): any {
    return {
      title: shopifyCollection.title,
      handle: shopifyCollection.handle,
      store_id: storeId,
      metadata: {
        sh_id: shopifyCollection.id,
        sh_body: shopifyCollection.body_html,
      },
    };
  }

  normalizeSmartCollection_(smartCollection, storeId: string): any {
    return {
      collection: {
        title: smartCollection.title,
        handle: smartCollection.handle,
        store_id: storeId,
        metadata: {
          sh_id: smartCollection.id,
          sh_body: smartCollection.body_html,
        },
      },
      rules: smartCollection.rules,
      disjunctive: smartCollection.disjunctive,
    };
  }
  async getStoreByIdOrName(storeId: string): Promise<Store | undefined> {
    const storeRepo =
      process.env.NODE_ENV == "test"
        ? this.storeRepository_
        : this.manager_.getRepository(Store);
    const availableStore =
      (await storeRepo.findOne({
        where: {
          id: storeId,
        },
      })) ??
      (await storeRepo.findOne({
        where: {
          name: storeId,
        },
      }));

    return availableStore;
  }
}

export default ShopifyCollectionService;
