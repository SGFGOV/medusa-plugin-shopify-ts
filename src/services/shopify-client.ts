import { EventBusService, TransactionBaseService } from "@medusajs/medusa";
import { Logger } from "@medusajs/medusa/dist/types/global";
import { DataType } from "@shopify/shopify-api";
import { RestClient } from "@shopify/shopify-api/dist/clients/rest";
import {
  ClientOptions,
  ShopifyData,
  ShopifyImportCallBack,
  ShopifyImportRequest,
} from "interfaces/shopify-interfaces";
import { BaseService } from "medusa-interfaces";
import { EntityManager, Transaction } from "typeorm";
import { createClient } from "../utils/create-client";
import { pager } from "../utils/pager";
import ShopifyService from "./shopify";

export interface ShopifyClientServiceProps {
  manager: EntityManager;
  eventBusService: EventBusService;
  logger: Logger;
}

class ShopifyClientService extends TransactionBaseService {
  protected transactionManager_: EntityManager;
  options: ClientOptions;
  defaultRestClient_: RestClient;
  protected eventbus_: EventBusService;
  protected manager_: EntityManager;
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
        manager: this.manager_,
        logger: this.logger,
      },
      this.options
    );
    return clone as this;
  }

  static createClient(options: ClientOptions): RestClient {
    return options.defaultClient ?? createClient(options);
  }

  get(params: any, client = this.defaultRestClient_): any {
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

  delete(params: any, client = this.defaultRestClient_): any {
    return client.delete(params);
  }

  post(
    params: { path: any; body: any; type?: DataType },
    client = this.defaultRestClient_
  ): any {
    return client.post({
      path: params.path,
      data: params.body,
      type: DataType.JSON,
    });
  }

  put(params: any, client = this.defaultRestClient_): any {
    return client.post(params);
  }

  setClient(defaultRestClient_: RestClient): void {
    this.defaultRestClient_ = defaultRestClient_;
  }
}

export default ShopifyClientService;
