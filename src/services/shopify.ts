/* eslint-disable valid-jsdoc */
import {
  BatchJob,
  BatchJobService,
  BatchJobStatus,
  EventBusService,
  ShippingProfileService,
  Store,
  StoreService,
  TransactionBaseService,
  User,
  UserService,
} from "@medusajs/medusa";
import { StoreRepository } from "@medusajs/medusa/dist/repositories/store";
import { ConfigModule, Logger } from "@medusajs/medusa/dist/types/global";
import {
  ClientOptions,
  FetchedShopifyData,
  ShopifyData,
  ShopifyImportCallBack,
  ShopifyImportRequest,
  ShopifyRequest,
} from "interfaces/shopify-interfaces";
import { MedusaError } from "medusa-core-utils";
import { EntityManager } from "typeorm";
import { INCLUDE_PRESENTMENT_PRICES } from "../utils/const";
import ShopifyClientService from "./shopify-client";
import ShopifyCollectionService from "./shopify-collection";
import ShopifyProductService from "./shopify-product";
import { ShopifyPath } from "../interfaces/shopify-interfaces";
import { sleep } from "@medusajs/medusa/dist/utils/sleep";

export interface ShopifyServiceParams {
  manager: EntityManager;
  eventBusService: EventBusService;
  shippingProfileService: ShippingProfileService;
  storeService: StoreService;
  shopifyProductService: ShopifyProductService;
  shopifyCollectionService: ShopifyCollectionService;
  shopifyClientService: ShopifyClientService;
  storeRepository: typeof StoreRepository;
  userService: UserService;
  batchJobService: BatchJobService;
  logger: Logger;
  configModule: ConfigModule;
}
export type ShopifyBatchTask = {
  path: string;
  batchJobId: string;
};

export type BatchActionCallBack = (BatchJob) => Promise<any>;

class ShopifyService extends TransactionBaseService {
  protected manager_: EntityManager;
  protected transactionManager_: EntityManager;
  storeRepository: typeof StoreRepository;
  options: ClientOptions;
  shippingProfileService_: ShippingProfileService;
  shopifyProductService_: ShopifyProductService;
  shopifyCollectionService_: ShopifyCollectionService;
  shopifyClientService_: ShopifyClientService;
  storeService_: StoreService;
  logger: Logger;
  buildService_: any;
  lastFetchedProducts: ShopifyData;
  lastFetchedCustomCollections: ShopifyData;
  lastFetchedSmartCollections: ShopifyData;
  batchJobService_: BatchJobService;

  userService: UserService;
  configModule: ConfigModule;
  eventBus_: EventBusService;
  lastFetchedCollects: ShopifyData;
  defaultBatchActionNotifier: BatchActionCallBack;
  requestBatchTasks: Map<string, ShopifyBatchTask[]> = new Map<
    string,
    ShopifyBatchTask[]
  >();
  lastFetchedMetafields: ShopifyData;

  constructor(container: ShopifyServiceParams, options: ClientOptions) {
    super(container);

    this.options = options;

    /** @private @const {EntityManager} */
    this.manager_ = container.manager;
    /** @private @const {ShippingProfileService} */
    this.shippingProfileService_ = container.shippingProfileService;
    /** @private @const {ShopifyProductService} */
    this.shopifyProductService_ = container.shopifyProductService;
    /** @private @const {ShopifyCollectionService} */
    this.shopifyCollectionService_ = container.shopifyCollectionService;
    /** @private @const {ShopifyRestClient} */
    this.shopifyClientService_ = container.shopifyClientService;
    /** @private @const {StoreService} */
    this.storeService_ = container.storeService;
    /** @private @const {StoreRepository} */
    this.storeRepository = container.storeRepository;
    /** @private @const {BatchJobService} */
    this.batchJobService_ = container.batchJobService;
    /** @private @const {UserService} */
    this.userService = container.userService;

    this.configModule = container.configModule;
    /** @private @const {Logger} */
    this.logger = container.logger;
    this.eventBus_ = container.eventBusService;
  }

  withTransaction(transactionManager: EntityManager): this {
    if (!transactionManager) {
      return this;
    }

    const cloned = new ShopifyService(
      {
        manager: transactionManager,
        shippingProfileService: this.shippingProfileService_,
        shopifyClientService: this.shopifyClientService_,
        shopifyProductService: this.shopifyProductService_,
        shopifyCollectionService: this.shopifyCollectionService_,
        storeService: this.storeService_,
        batchJobService: this.batchJobService_,
        logger: this.logger,
        storeRepository: this.storeRepository,
        userService: this.userService,
        configModule: this.configModule,
        eventBusService: this.eventBus_,
      },
      this.options
    );
    this.transactionManager_ = transactionManager;
    return cloned as this;
  }

  async fetchFromShopifyAndProcess(
    shopifyRequest: ShopifyRequest,
    userId?: string,
    gotPageCallBack?: ShopifyImportCallBack
  ): Promise<any> {
    this.lastFetchedProducts =
      await this.fetchFromShopifyAndProcessSingleCategory(
        shopifyRequest,
        "products",
        userId,
        gotPageCallBack
      );
    if (this.lastFetchedProducts?.length) {
      this.lastFetchedCollects =
        await this.fetchFromShopifyAndProcessSingleCategory(
          shopifyRequest,
          "collects",
          userId,
          gotPageCallBack
        );
      this.lastFetchedCustomCollections =
        await this.fetchFromShopifyAndProcessSingleCategory(
          shopifyRequest,
          "custom_collections",
          userId,
          gotPageCallBack
        );
      this.lastFetchedSmartCollections =
        await this.fetchFromShopifyAndProcessSingleCategory(
          shopifyRequest,
          "smart_collections",
          userId,
          gotPageCallBack
        );

      return {
        products: this.lastFetchedProducts,
        customCollections: this.lastFetchedCustomCollections,
        smartCollections: this.lastFetchedSmartCollections,
        collects: this.lastFetchedCollects,
        //  client: client_,
      };
    }
  }

  async fetchFromShopifyAndProcessSingleCategory(
    shopifyRequest: ShopifyRequest,
    category: ShopifyPath = "products",
    userId?: string,
    gotPageCallBack?: ShopifyImportCallBack
  ): Promise<ShopifyData> {
    const client_ = this.shopifyClientService_;

    const updatedSinceQuery = await this.getAndUpdateBuildTime_(
      shopifyRequest.default_store_name
    );

    await this.shippingProfileService_.createDefault();
    await this.shippingProfileService_.createGiftCardDefault();

    return await client_.listAndImport(
      shopifyRequest as ShopifyImportRequest,
      this,
      userId,
      category,
      INCLUDE_PRESENTMENT_PRICES,
      updatedSinceQuery,
      gotPageCallBack,
      client_.defaultRestClient_
    );
  }

  async importIntoStore(
    shopifyImportRequest: ShopifyImportRequest,
    defaultJobNotifier?: BatchActionCallBack
  ): Promise<boolean | FetchedShopifyData> {
    const adminUser = await this.atomicPhase_(async (transactionManager) => {
      let adminUser: User;
      try {
        adminUser = await this.userService
          .withTransaction(transactionManager)
          .retrieveByEmail(shopifyImportRequest.medusa_store_admin_email);
        return adminUser;
      } catch (e) {
        this.handleError(e);
        return false;
      }
    });
    this.defaultBatchActionNotifier = defaultJobNotifier;
    if (adminUser) {
      const importJobs = await this.fetchFromShopifyAndProcess(
        shopifyImportRequest,
        adminUser.id,
        this.createBatchAndProcess
      );
      return importJobs;
    }
  }

  async createBatchAndProcess(
    self: ShopifyService,
    shopifyData: ShopifyData[],
    shopifyImportRequest: ShopifyImportRequest,
    userId: string,
    path: ShopifyPath
  ): Promise<BatchJob> {
    const isTest = process.env.NODE_ENV == "test";
    let job = await self.atomicPhase_(async (transactionManager) => {
      return await self.batchJobService_
        .withTransaction(transactionManager)
        .create({
          type: "shopify-import",
          context: {
            shopifyData,
            shopifyImportRequest,
            path,
          },
          created_by: userId,
          dry_run: isTest,
        });
    });
    job.loadStatus();

    let batchTasks = self.requestBatchTasks.get(shopifyImportRequest.requestId);
    const batchTask: ShopifyBatchTask = {
      path,
      batchJobId: job.id,
    };
    if (!batchTasks) {
      batchTasks = [batchTask];
    } else {
      batchTasks.push(batchTask);
    }
    self.requestBatchTasks.set(shopifyImportRequest.requestId, batchTasks);

    while (job.status != BatchJobStatus.CREATED) {
      job.loadStatus();
      job = await self.atomicPhase_(async (transactionManager) => {
        return await self.batchJobService_
          .withTransaction(transactionManager)
          .retrieve(job.id);
      });
    }
    if (isTest) {
      job = await self.atomicPhase_(async (transactionManager) => {
        return await self.batchJobService_
          .withTransaction(transactionManager)
          .setPreProcessingDone(job);
      });

      job = await self.atomicPhase_(async (transactionManager) => {
        return await self.batchJobService_
          .withTransaction(transactionManager)
          .confirm(job);
      });
    }
    self.logger?.info(
      `${job.id}  import in progress - ${path} batch ${job.status} `
    );
    if (self.defaultBatchActionNotifier) {
      await self.defaultBatchActionNotifier(job);
    }
    job = await self.atomicPhase_(async (transactionManager) => {
      return await self.batchJobService_
        .withTransaction(transactionManager)
        .retrieve(job.id);
    });
    return job;
  }

  async getStoreById(store_id: string): Promise<Store | undefined> {
    const storeRepo = this.manager_.getRepository(Store);
    const availableStore = await storeRepo.findOne({
      where: {
        id: store_id,
      },
    });

    return availableStore;
  }

  async getStoreByName(store_name: string): Promise<Store | undefined> {
    const storeRepo = this.manager_.getCustomRepository(StoreRepository);
    const availableStore = await storeRepo.findOne({
      where: {
        name: store_name,
      },
    });

    return availableStore;
  }

  async getAndUpdateBuildTime_(name: string): Promise<any> {
    let buildtime = null;

    const store: Store = await this.getStoreByName(name);
    if (!store) {
      return {};
    }
    if (store.metadata?.source_shopify_bt) {
      buildtime = store.metadata.source_shopify_bt;
    }

    const getTimeZone = (currentDate: Date): string => {
      const timezoneOffset = currentDate.getTimezoneOffset();
      const offset = Math.abs(timezoneOffset);
      const offsetOperator = timezoneOffset < 0 ? "+" : "-";
      const offsetHours = Math.floor(offset / 60)
        .toString()
        .padStart(2, "0");
      const offsetMinutes = Math.floor(offset % 60)
        .toString()
        .padStart(2, "0");

      return `${offsetOperator}${offsetHours}:${offsetMinutes}`;
    };
    const currentDate = new Date();
    let dateString = currentDate.toISOString();
    dateString =
      dateString.substring(0, dateString.length - 5) + getTimeZone(currentDate);
    buildtime = buildtime
      ? buildtime?.substring(0, dateString.length - 5) +
        getTimeZone(currentDate)
      : undefined;
    const payload = {
      metadata: {
        source_shopify_bt: dateString,
      },
    };

    await this.atomicPhase_(async (manager) => {
      return await this.storeService_.withTransaction(manager).update(payload);
    });

    if (!buildtime) {
      return {};
    }

    return {
      updated_at_min: buildtime,
    };
  }
  async handleError(e: Error): Promise<void> {
    this.logger.error("Shopify Plugin Error " + e.message);
  }

  async handleWarn(e: Error): Promise<void> {
    this.logger.error("Shopify Plugin Error " + e.message);
  }

  async getBatchTasks(requestId): Promise<ShopifyBatchTask[]> {
    return this.requestBatchTasks.get(requestId);
  }
}

export default ShopifyService;
