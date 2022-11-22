import { ShippingProfileService, StoreService, TransactionBaseService } from "@medusajs/medusa"
import { Logger } from "@medusajs/medusa/dist/types/global"
import { BaseService } from "medusa-interfaces"
import { EntityManager } from "typeorm"
import { INCLUDE_PRESENTMENT_PRICES } from "../utils/const"
import ShopifyClientService from "./shopify-client"
import ShopifyCollectionService from "./shopify-collection"
import ShopifyProductService from "./shopify-product"


export interface ShopifyServiceParams   {
    manager_:EntityManager,
    shippingProfileService:ShippingProfileService,
    storeService:StoreService,
    shopifyProductService:ShopifyProductService,
    shopifyCollectionService:ShopifyCollectionService,
    shopifyClientService:ShopifyClientService,
    logger:Logger,
  }




class ShopifyService extends TransactionBaseService {
  protected manager_: EntityManager
  protected transactionManager_: EntityManager
  options: any
  shippingProfileService_: any
  shopifyProductService_: any
  shopifyCollectionService_: any
  client_: any
  store_: any
  logger: any
  buildService_:any
  constructor(
    container:ShopifyServiceParams,
        options
  ) {
    super(container)

    this.options = options

    /** @private @const {EntityManager} */
    this.manager_ = container.manager_
    /** @private @const {ShippingProfileService} */
    this.shippingProfileService_ = container.shippingProfileService
    /** @private @const {ShopifyProductService} */
    this.shopifyProductService_ = container.shopifyProductService
    /** @private @const {ShopifyCollectionService} */
    this.shopifyCollectionService_ = container.shopifyCollectionService
    /** @private @const {ShopifyRestClient} */
    this.client_ = container.shopifyClientService
    /** @private @const {StoreService} */
    this.store_ = container.storeService

    /** @private @const {Logger} */
    this.logger = container.logger
  }

  withTransaction(transactionManager):this {
    if (!transactionManager) {
      return this
    }

    const cloned = new ShopifyService({
      manager_: transactionManager,
      shippingProfileService: this.shippingProfileService_,
      shopifyClientService: this.client_,
      shopifyProductService: this.shopifyProductService_,
      shopifyCollectionService: this.shopifyCollectionService_,
      storeService: this.store_,
      logger:this.logger,
    }, this.options)

    cloned.transactionManager_ = transactionManager

    return cloned as this
  }

  async importShopify() {
    return this.atomicPhase_(async (manager) => {
      const updatedSinceQuery = await this.getAndUpdateBuildTime_()

      await this.shippingProfileService_.createDefault()
      await this.shippingProfileService_.createGiftCardDefault()

      const products = await this.client_.list(
        "products",
        INCLUDE_PRESENTMENT_PRICES,
        updatedSinceQuery
      )

      const customCollections = await this.client_.list(
        "custom_collections",
        null,
        updatedSinceQuery
      )

      const smartCollections = await this.client_.list(
        "smart_collections",
        null,
        updatedSinceQuery
      )

      const collects = await this.client_.list(
        "collects",
        null,
        updatedSinceQuery
      )
      const breakOut = 100
      const resolvedProducts = []
      for (let i = 0; i < products?.length && i < breakOut; i++) {
        this.logger.info(
          `created product  ${i}/${products.length} ${products[i].handle}`
        )
        const result = await this.shopifyProductService_
          .withTransaction(manager)
          .create(products[i])
        resolvedProducts.push(result)
      }

      /* const resolvedProducts = await Promise.all(
        products.map(async (product, index, array) => {
          this.logger.info(
            `created product  ${index}/${array.length} ${product.handle}`
          )
          return 
        })
      )*/

      await this.shopifyCollectionService_
        .withTransaction(manager)
        .createCustomCollections(collects, customCollections, resolvedProducts)

      await this.shopifyCollectionService_
        .withTransaction(manager)
        .createSmartCollections(smartCollections, resolvedProducts)
    },this.handleError,this.handleWarn)
  }

  async getAndUpdateBuildTime_() {
    let buildtime = null
    const store = await this.store_.retrieve()
    if (!store) {
      return {}
    }

    if (store.metadata?.source_shopify_bt) {
      buildtime = store.metadata.source_shopify_bt
    }

    const payload = {
      metadata: {
        source_shopify_bt: new Date().toISOString(),
      },
    }

    await this.store_.update(payload)

    if (!buildtime) {
      return {}
    }

    return {
      updated_at_min: buildtime,
    }
  }
  async handleError(e) {

    this.logger.error("Shopify Plugin Error "+e.message)

}

async handleWarn(e) {

  this.handleWarn("Shopify Plugin Error "+e.message)

}
}

export default ShopifyService
