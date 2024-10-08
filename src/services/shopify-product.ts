/* eslint-disable valid-jsdoc */
import {
  EventBusService,
  Product,
  ProductStatus,
  ProductVariantService,
  ShippingProfileService,
  TransactionBaseService,
} from "@medusajs/medusa";
import { Logger } from "@medusajs/medusa/dist/types/global";
import {
  CreateProductInput,
  CreateProductProductOption,
  CreateProductProductTagInput,
} from "@medusajs/medusa/dist/types/product";
import axios from "axios";
import { ClientOptions } from "interfaces/shopify-interfaces";
import isEmpty from "lodash/isEmpty";
import omit from "lodash/omit";
import random from "lodash/random";
import { MedusaError } from "medusa-core-utils";
import { EntityManager } from "typeorm";
import { parsePrice } from "../utils/parse-price";
import { MultiStoreProductService } from "./modified-core-services/multistore-product";
import ShopifyClientService from "./shopify-client";
import ShopifyRedisService from "./shopify-redis";
import { AwilixContainer, Lifetime } from "awilix";

export interface ShopifyProductServiceParams {
  manager: EntityManager;
  productService: MultiStoreProductService;
  productVariantService: ProductVariantService;
  shippingProfileService: ShippingProfileService;
  shopifyClientService: ShopifyClientService;
  shopifyRedisService: ShopifyRedisService;
  eventBusService: EventBusService;
  logger: Logger;
}

export type NormalisedProduct = {
  title: string;
  handle: string;
  description: string;
  profile_id: string;
  type: {
    value: string;
  };
  is_giftcard: boolean;
  options?: CreateProductProductOption[];
  variants?: any[];
  tags?: CreateProductProductTagInput[];
  images?: string[];
  thumbnail?: string;
  external_id: string;
  status: ProductStatus;
  metadata?: {
    vendor?: string;
  };
  store_id?: string;
};
export type ShopifyProduct = {
  id: string;
  title?: string;
  handle?: string;
  type?: string;
  product_type?: string;
  body_html?: string;
  tags?: string;
};

export type ShopifyVariant = {
  option3?: any;
  option2?: any;
  option1?: any;
  presentment_prices?: string;

  sku?: string;
  barcode?: string;
  inventory_quantity?: string;
  position?: string;
  inventory_policy?: string;
  inventory_management?: string;

  id: string;
  price?: number;
  grams?: number;
  inventory_police?: string;
  title?: string;
};

export type UpdateProductAction = {
  product: ShopifyProduct;
};

export type UpdateVariantAction = {
  variant: ShopifyVariant;
};

class ShopifyProductService extends TransactionBaseService {
  static LIFE_TIME = Lifetime.TRANSIENT;
  options: ClientOptions;
  productService_: MultiStoreProductService;
  productVariantService_: ProductVariantService;
  shippingProfileService_: ShippingProfileService;
  shopify_: ShopifyClientService;
  redis_: ShopifyRedisService;
  logger: Logger;
  eventBusService: EventBusService;
  container: AwilixContainer;
  constructor(container: ShopifyProductServiceParams, options) {
    super(container);
    this.container = container as unknown as AwilixContainer;
    this.options = options;

    /** @private @const {EntityManager} */
    this.manager_ = container.manager;
    /** @private @const {ProductService} */
    this.productService_ = container.productService;
    /** @private @const {ProductVariantService} */
    this.productVariantService_ = container.productVariantService;
    /** @private @const {ShippingProfileService} */
    this.shippingProfileService_ = container.shippingProfileService;
    /** @private @const {ShopifyRestClient} */
    this.shopify_ = container.shopifyClientService;

    this.redis_ = container.shopifyRedisService;
    this.logger = container.logger;
    this.eventBusService = container.eventBusService;
  }

  withTransaction(transactionManager): this {
    if (!transactionManager) {
      return this;
    }

    const cloned = new ShopifyProductService(
      {
        manager: transactionManager,
        shippingProfileService: this.shippingProfileService_,
        productVariantService: this.productVariantService_,
        productService: this.productService_,
        shopifyClientService: this.shopify_,
        shopifyRedisService: this.redis_,
        eventBusService: this.eventBusService,
        logger: this.logger,
      },
      this.options
    );

    cloned.transactionManager_ = transactionManager;

    return cloned as this;
  }

  /**
   * Creates a product based on an event in Shopify.
   * Also adds the product to a collection if a collection id is provided
   * @param {object} data
   * @param {string} collectionId optional
   * @return {Product} the created product
   */
  async create(data, store_id?: string): Promise<Product> {
    const result = await this.atomicPhase_(
      async (manager): Promise<any> => {
        const ignore = await this.redis_.shouldIgnore(
          data.id,
          "product.created"
        );
        if (ignore) {
          return;
        }
        this.logger.info("creating product: " + data.handle);
        let existingProduct: Product;
        let metafields;
        try {
          existingProduct = await this.productService_
            .withTransaction(manager)
            .retrieveByExternalId(
              data.id,
              {
                relations: ["variants", "options"],
              },
              store_id
            );

          if (existingProduct && this.options.overwrite_on_import) {
            metafields = await this.shopify_.get({
              path: `products/${data.id}/metafields.json`,
            });
            data["metafields"] = metafields;
            this.logger.info("updating product: " + data.handle);
            return await this.withTransaction(manager).update(
              existingProduct,
              data
            );
          } else if (existingProduct) {
            return existingProduct;
          } else {
            metafields = await this.shopify_.get({
              path: `products/${data.id}/metafields.json`,
            });
            data["metafields"] = metafields;
          }
        } catch (e) {
          this.logger.info("unable to verify if the product exists");
        }
        this.logger.info("normalising product: " + data.handle);
        const normalizedProduct = this.normalizeProduct_(data);
        normalizedProduct.profile_id = await this.getShippingProfile_(
          normalizedProduct.is_giftcard
        );

        let variants = normalizedProduct.variants;
        delete normalizedProduct.variants;

        this.logger.info("creating in medusa product: " + data.handle);

        const productToSave = store_id
          ? {
              ...normalizedProduct,
              store_id: store_id,
            }
          : normalizedProduct;
        let productUnderProcess = await manager.transaction(async (manager) => {
          const savedProduct = await this.productService_
            .withTransaction(manager)
            .create(productToSave as CreateProductInput);
          return savedProduct;
        });
        if (
          variants &&
          (!existingProduct || this.options.overwrite_on_import)
        ) {
          productUnderProcess = await this.productService_
            .withTransaction(manager)
            .retrieve(productUnderProcess.id, { relations: ["options"] });
          variants = variants.map((v) =>
            this.addVariantOptions_(v, productUnderProcess.options)
          );
          this.logger.info("adding variants in medusa product: " + data.handle);
          for (let variant of variants) {
            variant = await this.ensureVariantUnique_(variant);
            await this.productVariantService_
              .withTransaction(manager)
              .create(productUnderProcess.id, variant);
          }
        }

        await this.redis_.addIgnore(data.id, "product.created");

        if (
          metafields &&
          (!existingProduct || this.options.overwrite_on_import)
        ) {
          if (this.options.handleMetafields) {
            await this.options.handleMetafields(
              this.container,
              metafields,
              productUnderProcess
            );
          }
          await this.eventBusService
            .withTransaction(manager)
            .emit("shopify.data.metafields.found", {
              product_id: productUnderProcess.id,
              metafields,
            });
        }

        return productUnderProcess;
      },
      this.handleError,
      this.handleWarn
    );
    return await result;
  }

  async update(existing, shopifyUpdate): Promise<Product> {
    return this.atomicPhase_(
      async (manager): Promise<any> => {
        const ignore = await this.redis_.shouldIgnore(
          shopifyUpdate.id,
          "product.updated"
        );
        if (ignore) {
          return;
        }

        const normalized = this.normalizeProduct_(
          shopifyUpdate,
          shopifyUpdate.store_id
        );

        existing = await this.addProductOptions_(existing, normalized.options);

        await this.updateVariants_(existing, normalized.variants);
        await this.deleteVariants_(existing, normalized.variants);
        delete normalized.variants;
        delete normalized.options;

        const update = {};

        for (const key of Object.keys(normalized)) {
          if (normalized[key] !== existing[key]) {
            update[key] = normalized[key];
          }
        }

        if (!isEmpty(update)) {
          await this.redis_.addIgnore(shopifyUpdate.id, "product.updated");
          return await this.productService_
            .withTransaction(manager)
            .update(existing.id, update);
        }

        return Promise.resolve();
      },
      this.handleError,
      this.handleWarn
    );
  }

  /**
   * Deletes a product based on an event in Shopify
   * @param {string} id
   * @return {Promise}
   */
  async delete(id): Promise<any> {
    return this.atomicPhase_(
      async (manager) => {
        const product = await this.productService_.retrieveByExternalId(id);

        return await this.productService_
          .withTransaction(manager)
          .delete(product.id);
      },
      this.handleError,
      this.handleWarn
    );
  }

  async shopifyProductUpdate(id, fields): Promise<any> {
    const product = await this.productService_.retrieve(id, {
      relations: ["tags", "type"],
    });

    // Event was not emitted by update
    if (!fields) {
      return;
    }

    const update: UpdateProductAction = {
      product: {
        id: product.external_id,
      },
    };

    if (fields.includes("title")) {
      update.product.title = product.title;
    }

    if (fields.includes("tags")) {
      const values = product.tags.map((t) => t.value);
      update.product.tags = values.join(",");
    }

    if (fields.includes("description")) {
      update.product.body_html = product.description;
    }

    if (fields.includes("handle")) {
      update.product.handle = product.handle;
    }

    if (fields.includes("type")) {
      update.product.type = product.type?.value;
    }

    if (fields.includes("product_type")) {
      update.product.product_type = product.type?.value;
    }

    await axios
      .put(
        `https://${this.options.store_domain}.myshopify.com/admin/api/2021-10/products/${product.external_id}.json`,
        update,
        {
          headers: {
            "X-Shopify-Access-Token": this.options.api_key,
          },
        }
      )
      .catch((err) => {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `An error occured while attempting to issue a product update to Shopify: ${err.message}`
        );
      });

    await this.redis_.addIgnore(product.external_id, "product.updated");
  }

  async shopifyVariantUpdate(id, fields): Promise<any> {
    const variant = await this.productVariantService_.retrieve(id, {
      relations: ["prices", "product"],
    });

    // Event was not emitted by update
    if (!fields) {
      return;
    }

    const update: UpdateVariantAction = {
      variant: {
        id: variant.metadata.sh_id as string,
      },
    };

    if (fields.includes("title")) {
      update.variant.title = variant.title;
    }

    if (fields.includes("allow_backorder")) {
      update.variant.inventory_police = variant.allow_backorder
        ? "continue"
        : "deny";
    }

    if (fields.includes("prices")) {
      update.variant.price = variant.prices[0].amount / 100;
    }

    if (fields.includes("weight")) {
      update.variant.grams = variant.weight;
    }

    await axios
      .put(
        `https://${this.options.store_domain}.myshopify.com/admin/api/2021-10/variants/${variant.metadata.sh_id}.json`,
        update,
        {
          headers: {
            "X-Shopify-Access-Token": this.options.api_key,
          },
        }
      )
      .catch((err) => {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `An error occured while attempting to issue a product update to Shopify: ${err.message}`
        );
      });

    await this.redis_.addIgnore(
      variant.metadata.sh_id,
      "product-variant.updated"
    );
  }

  async shopifyVariantDelete(productId, metadata): Promise<any> {
    const product = await this.productService_.retrieve(productId);

    await axios
      .delete(
        `https://${this.options.store_domain}.myshopify.com/admin/api/2021-10/products/${product.external_id}/variants/${metadata.sh_id}.json`,
        {
          headers: {
            "X-Shopify-Access-Token": this.options.api_key,
          },
        }
      )
      .catch((err) => {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `An error occured while attempting to issue a product variant delete to Shopify: ${err.message}`
        );
      });

    await this.redis_.addIgnore(metadata.sh_id, "product-variant.deleted");
  }

  async updateCollectionId(productId, collectionId): Promise<any> {
    return this.atomicPhase_(
      async (manager) => {
        return await this.productService_
          .withTransaction(manager)
          .update(productId, { collection_id: collectionId });
      },
      this.handleError,
      this.handleWarn
    );
  }

  async updateVariants_(
    product: NormalisedProduct & { id: string },
    updateVariants
  ): Promise<any> {
    return this.atomicPhase_(
      async (manager) => {
        const { id, variants, options } = product;
        for (let variant of updateVariants) {
          const ignore =
            (await this.redis_.shouldIgnore(
              variant.metadata.sh_id,
              "product-variant.updated"
            )) ||
            (await this.redis_.shouldIgnore(
              variant.metadata.sh_id,
              "product-variant.created"
            ));
          if (ignore) {
            continue;
          }

          variant = this.addVariantOptions_(variant, options);
          const match = variants?.find(
            (v) => v.metadata.sh_id === variant.metadata.sh_id
          );
          if (match) {
            variant = this.removeUniqueConstraint_(variant);

            await this.productVariantService_
              .withTransaction(manager)
              .update(match.id, variant);
          } else {
            await this.productVariantService_
              .withTransaction(manager)
              .create(id, variant);
          }
        }
      },
      this.handleError,
      this.handleWarn
    );
  }

  async deleteVariants_(product, updateVariants): Promise<any> {
    return this.atomicPhase_(
      async (manager) => {
        const { variants } = product;
        for (const variant of variants) {
          const ignore = await this.redis_.shouldIgnore(
            variant.metadata.sh_id,
            "product-variant.deleted"
          );
          if (ignore) {
            continue;
          }

          const match = updateVariants?.find(
            (v) => v.metadata.sh_id === variant.metadata.sh_id
          );
          if (!match) {
            await this.productVariantService_
              .withTransaction(manager)
              .delete(variant.id);
          }
        }
      },
      this.handleError,
      this.handleWarn
    );
  }

  addVariantOptions_(variant, productOptions): Promise<any> {
    const options = productOptions?.map((o, i) => ({
      option_id: o.id,
      ...variant.options[i],
    }));
    variant.options = options;

    return variant;
  }

  async addProductOptions_(product, updateOptions): Promise<any> {
    return this.atomicPhase_(
      async (manager) => {
        const { id, options } = product;

        for (const option of updateOptions) {
          const match = options.find((o) => o.title === option.title);
          if (match) {
            await this.productService_
              .withTransaction(manager)
              .updateOption(product.id, match.id, { title: option.title });
          } else if (!match) {
            await this.productService_
              .withTransaction(manager)
              .addOption(id, option.title);
          }
        }

        const result = await this.productService_
          .withTransaction(manager)
          .retrieve(id, {
            relations: ["variants", "options", "variants.options"],
          });

        return result;
      },
      this.handleError,
      this.handleWarn
    );
  }

  async getShippingProfile_(isGiftCard): Promise<any> {
    return await this.atomicPhase_(async (manager) => {
      let shippingProfile;
      if (isGiftCard) {
        shippingProfile = this.shippingProfileService_
          .withTransaction(manager)
          .retrieveGiftCardDefault();
      } else {
        shippingProfile = await this.shippingProfileService_.retrieveDefault();
      }

      return shippingProfile;
    });
  }

  /**
   * Normalizes a product, with a possible optional collection id
   * @param {object} product
   * @param {string} collectionId optional
   * @return {object} normalized object
   */
  normalizeProduct_(product, store_id?: string): NormalisedProduct {
    return {
      title: product.title,
      handle: product.handle,
      description: product.body_html,
      profile_id: product.profile_id,
      type: {
        value: product.product_type,
      },
      is_giftcard: product.product_type === "Gift Cards",
      options:
        product.options.map((option) => this.normalizeProductOption_(option)) ||
        [],
      variants:
        product.variants.map((variant) => this.normalizeVariant_(variant)) ||
        [],
      tags: product.tags.split(",").map((tag) => this.normalizeTag_(tag)) || [],
      images: product.images.map((img) => img.src) || [],
      thumbnail: product.image?.src || null,
      external_id: product.id,
      status: ProductStatus.DRAFT,
      metadata: {
        vendor: product.vendor,
      },
      store_id,
    };
  }

  /**
   * Normalizes a product option
   * @param {object} option
   * @return {object} normalized ProductOption
   */
  normalizeProductOption_(option): any {
    return {
      title: option.name,
      values: option.values.map((v) => {
        return { value: v };
      }),
    };
  }

  /**
   * Normalizes a product variant
   * @param {object} variant
   * @return {object} normalized variant
   */
  normalizeVariant_(variant: ShopifyVariant): any {
    return {
      title: variant.title,
      prices: this.normalizePrices_(variant.presentment_prices),
      sku: variant.sku || null,
      barcode: variant.barcode || null,
      upc: variant.barcode || null,
      inventory_quantity: variant.inventory_quantity,
      variant_rank: variant.position,
      allow_backorder: variant.inventory_policy === "continue",
      manage_inventory: variant.inventory_management === "shopify",
      weight: variant.grams,
      options: this.normalizeVariantOptions_(
        variant.option1,
        variant.option2,
        variant.option3
      ),
      metadata: {
        sh_id: variant.id,
      },
    };
  }

  /**
   * Normalizes an array of presentment prices
   * @param {array} presentmentPrices
   * @return {Object[]} array of normalized prices
   */
  normalizePrices_(presentmentPrices): any {
    return presentmentPrices.map((p) => {
      return {
        amount: parsePrice(p.price.amount),
        currency_code: p.price.currency_code?.toLowerCase() ?? "inr",
      };
    });
  }

  /**
   * Normalizes the three possble variant options
   * @param {string} option1
   * @param {string} option2
   * @param {string} option3
   * @return {Object[]} normalized variant options
   */
  normalizeVariantOptions_(option1, option2, option3): any {
    const opts = [];
    if (option1) {
      opts.push({
        value: option1,
      });
    }

    if (option2) {
      opts.push({
        value: option2,
      });
    }

    if (option3) {
      opts.push({
        value: option3,
      });
    }

    return opts;
  }

  /**
   * Normalizes a tag
   * @param {string} tag
   * @return {Object} normalized Tag
   */
  normalizeTag_(tag): any {
    return {
      value: tag,
    };
  }

  handleDuplicateConstraint_(uniqueVal): string {
    return `DUP-${random(100, 999)}-${uniqueVal}`;
  }

  async testUnique_(uniqueVal, type): Promise<any> {
    // Test if the unique value has already been added, if it was then pass the value onto the duplicate handler and return the new value
    const exists = await this.redis_.getUniqueValue(uniqueVal, type);

    if (exists) {
      const dupValue = this.handleDuplicateConstraint_(uniqueVal);
      await this.redis_.addUniqueValue(dupValue, type);
      return dupValue;
    }
    // If it doesn't exist, we return the value
    await this.redis_.addUniqueValue(uniqueVal, type);
    return uniqueVal;
  }

  async ensureVariantUnique_(variant): Promise<any> {
    let { sku, ean, upc, barcode } = variant;

    if (sku) {
      sku = await this.testUnique_(sku, "SKU");
    }

    if (ean) {
      ean = await this.testUnique_(ean, "EAN");
    }

    if (upc) {
      upc = await this.testUnique_(upc, "UPC");
    }

    if (barcode) {
      barcode = await this.testUnique_(barcode, "BARCODE");
    }

    return { ...variant, sku, ean, upc, barcode };
  }

  removeUniqueConstraint_(update): any {
    const payload = omit(update, ["sku", "ean", "upc", "barcode"]);

    return payload;
  }

  async handleError(e): Promise<void> {
    this?.logger.error("Shopify Plugin Error " + e.message);
  }

  async handleWarn(e): Promise<void> {
    this?.logger.warn("Shopify Plugin Error " + e.message);
  }
}

export default ShopifyProductService;
