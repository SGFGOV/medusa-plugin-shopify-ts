import { EventBusService, TransactionBaseService } from "@medusajs/medusa";
import { Logger } from "@medusajs/medusa/dist/types/global";
import { DataType } from "@shopify/shopify-api";
import { RestClient } from "@shopify/shopify-api/dist/clients/rest";
import { sleep } from "@medusajs/medusa/dist/utils/sleep";
import {
  ClientOptions,
  ShopifyImportCallBack,
  ShopifyImportRequest,
} from "interfaces/shopify-interfaces";
import { EntityManager } from "typeorm";
import { createClient } from "../utils/create-client";
import { pager } from "../utils/pager";
import ShopifyService from "./shopify";
import { DURATION_BETWEEN_CALLS } from "../utils/const";
import { Lifetime } from "awilix";

export interface ShopifyClientServiceProps {
  manager: EntityManager;
  eventBusService: EventBusService;
  logger: Logger;
}

class ShopifyClientService extends TransactionBaseService {
  static LIFE_TIME = Lifetime.TRANSIENT;
  options: ClientOptions;
  defaultRestClient_: RestClient;
  protected eventbus_: EventBusService;
  logger: Logger;
  // eslint-disable-next-line no-empty-pattern
  constructor(container: ShopifyClientServiceProps, options: ClientOptions) {
    super(container);
    const { manager, eventBusService, logger } = container;
    this.eventbus_ = eventBusService;
    this.manager_ = manager;
    this.logger = logger;
    this.transactionManager_ = manager;
    this.options = options;

    /** @private @const {ShopifyRestClient} */
    this.defaultRestClient_ =
      this.options.defaultClient ?? createClient(this.options);
  }

  withTransaction(transactionManager?: EntityManager): this {
    if (!transactionManager) {
      return this;
    }
    const clone = new ShopifyClientService(
      {
        eventBusService: this.eventbus_,
        manager: this.manager_ as any,
        logger: this.logger,
      },
      this.options
    );
    return clone as this;
  }

  static createClient(options: ClientOptions): RestClient {
    return options.defaultClient ?? createClient(options);
  }

  async get(params: any, client = this.defaultRestClient_): Promise<any> {
    await sleep(DURATION_BETWEEN_CALLS);
    return client.get(params);
  }

  async listAndImport(
    shopifyImportRequest: ShopifyImportRequest,
    shopifyService: ShopifyService,
    userId: string,
    path: string,
    extraHeaders = null,
    extraQuery = {},
    gotPageCallBack?: ShopifyImportCallBack,
    client = this.defaultRestClient_
  ): Promise<any> {
    return await pager(
      shopifyService,
      client,
      path,
      shopifyImportRequest,
      userId,
      extraHeaders,
      extraQuery,
      this.logger,
      gotPageCallBack
    );
  }

  async delete(params: any, client = this.defaultRestClient_): Promise<any> {
    await sleep(DURATION_BETWEEN_CALLS);
    return client.delete(params);
  }

  async post(
    params: { path: any; body: any; type?: DataType },
    client = this.defaultRestClient_
  ): Promise<any> {
    await sleep(DURATION_BETWEEN_CALLS);
    return client.post({
      path: params.path,
      data: params.body,
      type: DataType.JSON,
    });
  }

  async put(params: any, client = this.defaultRestClient_): Promise<any> {
    await sleep(DURATION_BETWEEN_CALLS);
    return client.post(params);
  }

  setClient(defaultRestClient_: RestClient): void {
    this.defaultRestClient_ = defaultRestClient_;
  }
}

export default ShopifyClientService;
