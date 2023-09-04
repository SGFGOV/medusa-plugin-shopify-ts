import { EntityManager } from "typeorm";
import {
  EventBusService,
  ProductService as MedusaProductService,
} from "@medusajs/medusa/dist/services";
import {
  PriceListLoadConfig,
  Product as MedusaProduct,
  Product,
  User,
} from "@medusajs/medusa/dist";
import { FilterableProductProps as MedusaFilterableProductProps } from "@medusajs/medusa/dist/types/product";
import { FindConfig, Selector } from "@medusajs/medusa/dist/types/common";
import { FindWithoutRelationsOptions } from "@medusajs/medusa/dist/repositories/product";
import { buildQuery } from "@medusajs/medusa/dist/utils";

class FilterableProductPropsMultiStore extends MedusaFilterableProductProps {
  store_id?: string;
}

interface FindProductMultiStoreConfig extends FindConfig<Product> {
  store_id?: string;
}

type FindProductConfig = FindProductMultiStoreConfig & PriceListLoadConfig;

export class MultiStoreProductService extends MedusaProductService {
  constructor(readonly container: any) {
    super(container);
  }

  async retrieve(
    productId: string,
    config: FindProductConfig = {
      include_discount_prices: false,
    }
  ): Promise<Product> {
    return await this.retrieve_({ id: productId }, config);
  }

  /* async retrieve_(
    selector: Selector<Product>,
    config: FindProductConfig = {
      include_discount_prices: false,
    }
  ): Promise<Product> {
    const manager = this.#manager;
    const productRepo = manager.getCustomRepository(this.productRepository_);

    const { relations, ...query } = buildQuery(selector, config);

    const product = await productRepo.findOneWithRelations(
      relations,
      query as FindWithoutRelationsOptions
    );

    if (!product) {
      const selectorConstraints = Object.entries(selector)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");

      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Product with ${selectorConstraints} was not found`
      );
    }

    return product as Product;
  }*/

  prepareListQuery_(
    selector: FilterableProductPropsMultiStore | Selector<Product>,
    config: FindProductConfig
  ): {
    q: string;
    relations: (keyof MedusaProduct)[];
    query: FindWithoutRelationsOptions;
  } {
    let q;
    if ("q" in selector) {
      q = selector.q;
      delete selector.q;
    }

    const query = buildQuery(selector, config);

    if (config.relations && config.relations.length > 0) {
      query.relations = config.relations;
    }

    if (config.select && config.select.length > 0) {
      query.select = config.select as any;
    }

    const rels = query.relations;
    delete query.relations;

    return {
      query: query as FindWithoutRelationsOptions,
      relations: rels as (keyof MedusaProduct)[],
      q,
    };
  }

  async retrieveByHandle(
    productHandle: string,
    config: FindProductConfig = {},
    store_id?: string
  ): Promise<Product> {
    const storeBasedConfig = store_id ? { ...config, store_id } : config;
    return await this.retrieve_({ handle: productHandle }, storeBasedConfig);
  }

  /**
   * Gets a product by external id.
   * Throws in case of DB Error and if product was not found.
   * @param externalId - handle of the product to get.
   * @param config - details about what to get from the product
   * @param store_id - the store id to reference
   * @return the result of the find one operation.
   */
  async retrieveByExternalId(
    externalId: string,
    config: FindProductConfig = {},
    store_id?: string
  ): Promise<Product> {
    const storeBasedConfig = store_id ? { ...config, store_id } : config;
    return await this.retrieve_({ external_id: externalId }, storeBasedConfig);
  }
}
