// shopify-redis
import { TransactionBaseService } from "@medusajs/medusa"
import { Logger } from "@medusajs/medusa/dist/types/global"
import { BaseService } from "medusa-interfaces"
import { EntityManager } from "typeorm"
import { IGNORE_THRESHOLD } from "../utils/const"


export interface ShopifyRedisServiceContainerProps 
  {manager_:any, redisClient:any, logger:Logger }



class ShopifyRedisService extends TransactionBaseService {
  protected manager_: EntityManager
  protected transactionManager_: EntityManager
  options_: any
  redis_: any
  logger: Logger
  constructor(container:ShopifyRedisServiceContainerProps, options) {
    super(container)

    this.options_ = options

    /** @private @const {RedisClient} */
    this.redis_ = container.redisClient
    this.logger = container.logger
    this.manager_ = container.manager_
  }

  withTransaction(transactionManager):this {
    if (!transactionManager) {
      return this
    }
    const cloned = new ShopifyRedisService({
      manager_: transactionManager,
      redisClient: this.redis_,
      logger: this.logger,
    },this.options_)

    cloned.transactionManager_ = transactionManager

    return cloned as this
  }

  async addIgnore(id, side) {
    const key = `sh_${id}_ignore_${side}`
    return await this.redis_.set(
      key,
      1,
      "EX",
      this.options_.ignore_threshold || IGNORE_THRESHOLD
    )
  }

  async shouldIgnore(id, action) {
    const key = `sh_${id}_ignore_${action}`
    return await this.redis_.get(key)
  }

  async addUniqueValue(uniqueVal, type) {
    const key = `sh_${uniqueVal}_${type}`
    return await this.redis_.set(key, 1, "EX", 60 * 5)
  }

  async getUniqueValue(uniqueVal, type) {
    const key = `sh_${uniqueVal}_${type}`
    return await this.redis_.get(key)
  }
}

export default ShopifyRedisService
