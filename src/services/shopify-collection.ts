import { ProductCollectionService, ProductService, StoreService, TransactionBaseService } from "@medusajs/medusa"
import { ProductRepository } from "@medusajs/medusa/dist/repositories/product"
import { Logger } from "@medusajs/medusa/dist/types/global"
import { BaseService } from "medusa-interfaces"
import { EntityManager, ObjectType } from "typeorm"
import { Options } from "utils/create-client"
import { removeIndex } from "../utils/remove-index"
import  ShopifyProductService  from "./shopify-product";

export interface ShopifyCollectionServiceParams   {
    manager:EntityManager,
    shopifyProductService:ShopifyProductService,
    productCollectionService:ProductCollectionService,
    productService:ProductService,
    storeService:StoreService,
    productRepository:ProductRepository,
    logger:Logger,
  }


class ShopifyCollectionService extends TransactionBaseService {
  protected manager_: EntityManager
  protected transactionManager_: EntityManager
  options: Options
  productService_: ShopifyProductService
  collectionService_: ProductCollectionService
  storeService_: StoreService
  medusaProductService_: ProductService
  productRepository_: ProductRepository
  logger: any
  constructor(
    container:ShopifyCollectionServiceParams,
    options
  ) {
    super(container)

    this.options = options

    /** @private @const {EntityManager} */
    this.manager_ = container.manager
    /** @private @const {ShopifyProductService} */
    this.productService_ = container.shopifyProductService
    /** @private @const {ProductCollectionService} */
    this.collectionService_ = container.productCollectionService
    /** @private @const {StoreService} */
    this.storeService_ = container.storeService
    /** @private @const {ProductService} */
    this.medusaProductService_ = container.productService

    /** @private @const {Product} */
    this.productRepository_ = container.productRepository
    this.logger = container.logger ?? console
  }

  withTransaction(transactionManager:EntityManager): this {
    if (!transactionManager) {
      return this
    }

    const cloned = new ShopifyCollectionService({
      manager: transactionManager,
      shopifyProductService: this.productService_,
      productCollectionService: this.collectionService_,
      storeService: this.storeService_,
      productService: this.medusaProductService_,
      productRepository: this.productRepository_,
      logger:this.logger
    },this.options)

    cloned.transactionManager_ = transactionManager

    return cloned as this
  }

  /**
   *
   * @param {Object[]} collects
   * @param {Object[]} collections
   * @param {Object[]} products
   * @return {Promise}
   */
  async createCustomCollections(collects, collections, products) {
    return this.atomicPhase_(async (manager) => {
      const normalizedCollections = collections.map((c) =>
        this.normalizeCustomCollection_(c)
      )

      const result = []

      for (const nc of normalizedCollections) {
        let collection = await this.collectionService_
          .retrieveByHandle(nc.handle)
          .catch((_) => undefined)

        if (!collection) {
          collection = await this.collectionService_
            .withTransaction(manager)
            .create(nc)
        }

        const productIds = this.getCustomCollectionProducts_(
          collection.metadata.sh_id,
          collects,
          products
        )

        await this.addProductsToCollection(collection.id, productIds)

        result.push(collection)
      }

      return result
    },this.logger.error,this.logger.info)
  }

  async createSmartCollections(collections, products) {
    return this.atomicPhase_(async (manager:EntityManager) => {
      if (!collections) {
        return Promise.resolve()
      }

      const productRepo = this.manager_.getCustomRepository(
        this.productRepository_ as unknown as ObjectType<ProductRepository>
      )

      const ids = products.map((p) => p.id)
      const completeProducts = await productRepo.findWithRelations(
        ["variants", "tags", "type"],
        ids
      )

      const defaultCurrency = await this.storeService_
        .retrieve()
        .then((store) => {
          return store.default_currency_code
        })
        .catch((_) => undefined)

      const normalizedCollections = collections.map((c) =>
        this.normalizeSmartCollection_(c)
      )

      const result = []

      for (const nc of normalizedCollections) {
        let collection = await this.collectionService_
          .retrieveByHandle(nc.collection.handle)
          .catch((_) => undefined)

        if (!collection) {
          collection = await this.collectionService_
            .withTransaction(manager)
            .create(nc.collection)
        }

        const validProducts = this.getValidProducts_(
          nc.rules,
          completeProducts,
          nc.disjunctive ?? false,
          defaultCurrency
        )

        if (validProducts.length) {
          const productIds = validProducts.map((p) => p.id)
          await this.addProductsToCollection(collection.id, productIds)
        }

        result.push(collection)
      }

      return result
    },this.logger.error,this.logger.info)
  }

  async addProductsToCollection(collectionId, productIds) {
    return this.atomicPhase_(async (manager) => {
      const result = await this.collectionService_
        .withTransaction(manager)
        .addProducts(collectionId, productIds)

      return result
    },this.logger.error,this.logger.info)
  }

  getCustomCollectionProducts_(shCollectionId, collects, products) {
    const medusaProductIds = products.reduce((prev, curr) => {
      if (curr.external_id) {
        prev[curr.external_id] = curr.id
      }

      return prev
    }, {})

    const productIds = collects.reduce((productIds, c) => {
      if (c.collection_id === shCollectionId) {
        productIds.push(`${c.product_id}`)
      }
      return productIds
    }, [])

    const productIdsToAdd = Object.keys(medusaProductIds).map((shopifyId) => {
      if (productIds.includes(shopifyId)) {
        const medusaId = medusaProductIds[shopifyId]
        delete medusaProductIds[shopifyId]
        return medusaId
      }
    })

    // remove added products from the array
    for (const id of productIdsToAdd) {
      const productToRemove = products.find((p) => p.id === id)
      if (productToRemove) {
        removeIndex(products, productToRemove)
      }
    }

    return productIdsToAdd
  }

  getValidProducts_(rules, products, disjunctive, defaultCurrency) {
    const validProducts = []

    for (const product of products) {
      const results = rules.map((r) =>
        this.testRule_(r, product, defaultCurrency)
      )

      if (disjunctive && !results.includes(false)) {
        validProducts.push(product)
      } else if (!disjunctive && results.includes(true)) {
        validProducts.push(product)
      }
    }

    // remove valid products from the array
    for (const validProduct of validProducts) {
      removeIndex(products, validProduct)
    }

    return validProducts
  }

  testRule_(rule, product, defaultCurrency = undefined) {
    const { column, relation, condition } = rule

    if (column === "title") {
      return this.testTextRelation_(product.title, relation, condition)
    }

    if (column === "type") {
      return this.testTextRelation_(product.type.value, relation, condition)
    }

    if (column === "vendor") {
      if (product.metadata?.vendor) {
        return this.testTextRelation_(
          product.metadata?.vendor,
          relation,
          condition
        )
      }

      return false
    }

    if (column === "variant_title") {
      if (product.variants?.length) {
        const anyMatch = product.variants.some((variant) => {
          return this.testTextRelation_(variant.title, relation, condition)
        })

        return anyMatch
      }

      return false
    }

    if (column === "tag") {
      if (product.tags) {
        const anyMatch = product.tags.some((tag) =>
          this.testTextRelation_(tag.value, relation, condition)
        )

        return anyMatch
      }

      return false
    }

    if (column === "variant_inventory") {
      if (product.variants?.length) {
        const anyMatch = product.variants.some((variant) =>
          this.testNumberRelation_(
            variant.inventory_quantity,
            relation,
            condition
          )
        )

        return anyMatch
      }

      return false
    }

    if (column === "variant_price") {
      if (product.variants?.length && defaultCurrency) {
        const prices = []

        for (const variant of product.variants) {
          if (variant.prices) {
            for (const price of variant.prices) {
              if (price.currency_code === defaultCurrency) {
                prices.push(price.amount)
              }
            }
          }
        }

        const anyMatch = prices.some((price) => {
          return this.testNumberRelation_(price, relation, condition)
        })

        return anyMatch
      }

      return false
    }

    if (column === "variant_weight") {
      if (product.variants?.length) {
        const anyMatch = product.variants.some((variant) =>
          this.testNumberRelation_(variant.weight, relation, condition)
        )

        return anyMatch
      }

      return false
    }

    // If we get here, it means the column is variant_compare_at_price which we don't support until we extend MoneyAmount
    return true
  }

  testTextRelation_(text, relation, condition) {
    if (relation === "contains") {
      return text.includes(condition)
    }

    if (relation === "equals") {
      return text === condition
    }

    if (relation === "not_equals") {
      return text !== condition
    }

    if (relation === "starts_with") {
      return text.startsWith(condition)
    }

    if (relation === "ends_with") {
      return text.endsWith(condition)
    }

    return false
  }

  testNumberRelation_(number, relation, condition) {
    if (relation === "greater_than") {
      return number > condition
    }

    if (relation === "less_than") {
      return number < condition
    }

    if (relation === "equals") {
      return number === condition
    }

    if (relation === "not_equals") {
      return number !== condition
    }

    return false
  }

  normalizeCustomCollection_(shopifyCollection) {
    return {
      title: shopifyCollection.title,
      handle: shopifyCollection.handle,
      metadata: {
        sh_id: shopifyCollection.id,
        sh_body: shopifyCollection.body_html,
      },
    }
  }

  normalizeSmartCollection_(smartCollection) {
    return {
      collection: {
        title: smartCollection.title,
        handle: smartCollection.handle,
        metadata: {
          sh_id: smartCollection.id,
          sh_body: smartCollection.body_html,
        },
      },
      rules: smartCollection.rules,
      disjunctive: smartCollection.disjunctive,
    }
  }
}

export default ShopifyCollectionService
