/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BatchJob,
  BatchJobService,
  BatchJobStatus,
  EventBusService,
  IdempotencyKey,
  IdempotencyKeyService,
  ProductCollectionService,
  ProductService,
  ProductVariantService,
  ShippingProfileService,
  StoreService,
  StrategyResolverService,
  UserService,
} from "@medusajs/medusa";
import { MockManager } from "medusa-test-utils";
import { ConfigModule, Logger } from "@medusajs/medusa/dist/types/global";
import ShopifyClientService from "../shopify-client";

const TestManager = {
  ...MockManager,
  withRepository:(repo:Repository<any>):Repository<any>=>repo
};


import {
  ShippingProfileServiceMock,
  ShopifyProductServiceMock,
  UserServiceMock,
  ShopifyRedisServiceMock,
  ProductCollectionServiceMock,
  ProductServiceMock,
} from "../__mocks__";

import LoggerMock from "../__mocks__/logger";
import ShopifyService from "../shopify";
import { StoreServiceMock } from "../__mocks__/store-service";
import ShopifyProductService from "../shopify-product";
import { StoreModelMock } from "../../repositories/__mocks__/store";
import { StoreRepository } from "@medusajs/medusa/dist/repositories/store";
import ShopifyCollectionService from "../shopify-collection";
import { ClientOptions, NewClientOptions } from "interfaces/shopify-interfaces";
import { RestClient } from "@shopify/shopify-api/dist/clients/rest";
import { RestClientMock } from "../__mocks__/rest-client";
import { StagedJobRepository } from "@medusajs/medusa/dist/repositories/staged-job";
import { BatchJobRepositoryMock } from "../../repositories/__mocks__/batch-job";
import { BatchJobRepository } from "@medusajs/medusa/dist/repositories/batch-job";
import { StagedJobRepositoryMock } from "../../repositories/__mocks__/staged-job";

import BatchJobSubscriber from "@medusajs/medusa/dist/subscribers/batch-job";
import ShopifyImportStrategy from "../../strategies/shopify-import";
import ShopifyRedisService from "../shopify-redis";
import { ProductVariantServiceMock } from "../__mocks__/product-variant";
import { ProductRepository } from "@medusajs/medusa/dist/repositories/product";
import { ProductModelMock } from "../../repositories/__mocks__/product";
import { AwilixContainer, createContainer, asValue, asClass, asFunction, AwilixResolutionError } from "awilix";
import BatchJobEventSubscriber from "../../subscribers/batch-job-event";
import { default as mockedRedis } from "../__mocks__/redis";
import _ from "lodash";
import { ProductOptionRepositoryMock } from "../../repositories/__mocks__/product-option";
import { ProductOptionRepository } from "@medusajs/medusa/dist/repositories/product-option";
import { ProductVariantRepository } from "@medusajs/medusa/dist/repositories/product-variant";
import { ProductVariantModelMock } from "../../repositories/__mocks__/product-variant";
import { ProductTypeModelMock } from "../../repositories/__mocks__/product-type";
import { ProductTypeRepository } from "@medusajs/medusa/dist/repositories/product-type";
import { ProductTagRepository } from "@medusajs/medusa/dist/repositories/product-tag";
import { ProductTagModelMock } from "../../repositories/__mocks__/product-tag";
import { ImageRepository } from "@medusajs/medusa/dist/repositories/image";
import { ImageModelMock } from "../../repositories/__mocks__/image";
import { sleep } from "@medusajs/medusa/dist/utils/sleep";
import JobSchedulerService from "@medusajs/medusa/dist/services/job-scheduler";
import { JobSchedulerServiceMock } from "../__mocks__/job-scheduler";
import { Repository } from "typeorm";

/** mocked values */
export const mockedLogger: jest.Mocked<Logger> = LoggerMock as any;
export const mockedShippingProfileService: jest.Mocked<ShippingProfileService> =   ShippingProfileServiceMock as any;
export const mockedStoreService: jest.Mocked<StoreService> =   StoreServiceMock as any;
export const mockedRestClient: jest.Mocked<RestClient> = RestClientMock as any;
export const mockedUserService: jest.Mocked<UserService> = UserServiceMock as any;
export const mockedShopifyProductService: jest.Mocked<ShopifyProductService> =  ShopifyProductServiceMock as any;
export const mockedProductService: jest.Mocked<ProductService> =   ProductServiceMock as any;
export const mockedProductVariantService: jest.Mocked<ProductVariantService> =   ProductVariantServiceMock as any;
export const mockedShopifyRedisService: jest.Mocked<ShopifyRedisService> =   ShopifyRedisServiceMock as any;
export const mockedStoreRespoistory: jest.Mocked<typeof StoreRepository> =   StoreModelMock as any;
export const mockedProductCollectionService: jest.Mocked<ProductCollectionService> =   ProductCollectionServiceMock as any;
export const mockedProductRepository: jest.Mocked<typeof ProductRepository> =   ProductModelMock as any;
export const mockedBatchRepository: jest.Mocked<typeof BatchJobRepository> =  BatchJobRepositoryMock as any;
export const mockedStagedJobRepository: jest.Mocked<typeof StagedJobRepository> = StagedJobRepositoryMock as any;
export const mockedProductOptionRepository: jest.Mocked<typeof ProductOptionRepository> =  ProductOptionRepositoryMock as any;
export const mockedProductVariantRepository: jest.Mocked<typeof ProductVariantRepository> =  ProductVariantModelMock as any;
export const mockedProductTypeRepository: jest.Mocked<typeof ProductTypeRepository> =  ProductTypeModelMock as any;
export const mockedProductTagRepository: jest.Mocked<typeof ProductTagRepository> =  ProductTagModelMock as any;
export const mockedImageRepository: jest.Mocked<typeof ImageRepository> =  ImageModelMock as any;
export const mockedjobSchedulerService: jest.Mocked<JobSchedulerService> =  JobSchedulerServiceMock as any;



export const mockedConfigFile = {
  projectConfig: {
    database_logging: false,
    database_type: "postgres",
  },
  featureFlags: {},
  plugins: [],
  resolve:():any=>{ return{
    projectConfig: {
      database_logging: false,
      database_type: "postgres",
    },
    featureFlags: {},
    plugins: [],
  };}
};

export const realData = (
  max_num: number
): NewClientOptions & { max_num_products: number } => {
  return {
    store_domain:  process.env.STORENAME,
    api_key: process.env.SHOPIFY_API_KEY,
    default_store_name: process.env.MEDUSA_STORE_NAME,
    max_num_products: max_num,
    
  };
};

export const mockData = (
  max_num: number
): NewClientOptions & { max_num_products: number,  requestId: string} => {
  return {
    store_domain: "test",
    api_key: "abced",
    default_store_name: "teststore",
    max_num_products: max_num,
    defaultClient:mockedRestClient,
    medusa_store_admin_email: "vandijk@test.dk",
    requestId:"test-id",
       
  };
};

function makeMockValue(value:any):any{
  return {
    ...value, /* jugaad */
    resolve:(container):any=>{

      const resolutions = ():any=> {
      const keys = Object.keys(value);
      if(keys.indexOf("resolve")){
       const result = {};
       keys.map((p,i)=>{try{
        const resolvedSingle = value[p]?.resolve?value[p].resolve?value[p].resolve(container):value[p]:value[p];
        result[p] = resolvedSingle;
      }
       catch(e)
       {
        console.log(e);
       }
        
      });
      return result;
      }
      else{
        return value;
      }
    };

      return resolutions();
  },
};
}

const mocks = {
  productRepository:asFunction(()=>mockedProductRepository).singleton(),
  productCollectionService: asFunction(()=>mockedProductCollectionService).singleton(),
  jobSchedulerService: asFunction(()=>mockedjobSchedulerService).singleton(),
    

  storeRepository: asFunction(()=>mockedStoreRespoistory).singleton(),
  logger: asFunction(()=>mockedLogger).singleton(),
  shippingProfileService: asFunction(()=>mockedShippingProfileService).singleton(),
  storeService: asFunction(()=>mockedStoreService).singleton(),
  restClient: asFunction(()=>mockedRestClient).singleton(),
  stagedJobRepository: asFunction(()=>mockedStagedJobRepository).singleton(),
  batchJobRepository: asFunction(()=>mockedBatchRepository).singleton(),
  userService: asFunction(()=>mockedUserService).singleton(),
  // eventBusService:mockedEventBusService).singleton(),
  redisClient:asFunction(()=>mockedRedis).singleton(),
  redisSubscriber:asFunction(()=>mockedRedis).singleton(),
  manager: asFunction(()=>TestManager).singleton(),
  productService: asFunction(()=>mockedProductService).singleton(),
  productVariantService: asFunction(()=>mockedProductVariantService).singleton(),
  shopifyRedisService: asFunction(()=>mockedShopifyRedisService).singleton(),
  configModule: asFunction(()=>mockedConfigFile).singleton(),
  config: asFunction(()=>mockedConfigFile).singleton(),
  singleton: asFunction(()=>{ return{ singleton:true }; }).singleton(),
  productOptionRepository:asFunction(()=>mockedProductOptionRepository).singleton(),
  productVariantRepository:asFunction(()=>mockedProductVariantRepository).singleton(),
  productTypeRepository:asFunction(()=>mockedProductTypeRepository).singleton(),
  productTagRepository:asFunction(()=>mockedProductTagRepository).singleton(),
  imageRepository:asFunction(()=>mockedImageRepository).singleton()
};



function registerActuals (testContainer:AwilixContainer,
  actualsList:[],actualType:string):AwilixContainer   
{
  for (let i = 0; i < actualsList.length; i++) {
  const myClass = actualsList[i] as any;
  const className = myClass.name;
  const propertyNameFirstLetter = className[0].toLowerCase();
  const classNameRest = className.substring(1);
  let propertyName = propertyNameFirstLetter + classNameRest;
  const serviceKey = propertyName.indexOf(actualType);
  propertyName = serviceKey<0?propertyName+actualType:propertyName;
  testContainer.register<typeof myClass>(
    propertyName,
    asClass(myClass).singleton()
  );
  // testContainer.resolve(propertyName,{allowUnregistered:false});
}
return testContainer;
}


export function configurContainer(): AwilixContainer {
  let testContainer = createContainer();
  /** needed to inject configured values mocks or otherwise */
 
  const  resolveAndRegister = ():any=>{
    const resolved={};
  for (const key of Object.keys(mocks)) {
    const constMock = testContainer.resolve(key);
    testContainer.register(key, constMock) ;
    resolved[key] = constMock.resolve?constMock.resolve(testContainer):constMock;
    testContainer.register(key, asValue(resolved[key]));
  }
  return resolved;
  };

  const  resolveAndRegisterMocks = ():any=>{
    const resolved={};
  for (const key of Object.keys(mocks)) {
   // const constMock = testContainer.resolve("mocks")[key];
    testContainer.register(key,asValue (mocks[key])) ;
    console.log(key);
    resolved[key] = testContainer.resolve(key).resolve(testContainer);
    testContainer.register(key, asValue(resolved[key]));
   
  }
  return resolved;
  };


  testContainer.register("_a",asFunction(()=>
 {return resolveAndRegister();}).singleton());
 testContainer.register("container",asFunction(()=>
 {return resolveAndRegister();}).singleton());
 
 testContainer.register("config",asFunction(()=>mockedConfigFile).singleton());
 
 testContainer.register("mocks",asFunction(()=>
 {
  return resolveAndRegisterMocks();}).singleton());

  

// testContainer.register("mocks",asValue(mocks));
 const actualServices = [
  StrategyResolverService,
  EventBusService,
  BatchJobService,
  // ProductService,
];


 testContainer = registerActuals(testContainer,actualServices as any,"Service");
 testContainer.register("config",asFunction(()=>mockedConfigFile).singleton());

 


 testContainer.resolve("mocks");
 testContainer.resolve("eventBusService");



/**
 * subscribers
 */

 const actualSubscribers = [
  BatchJobSubscriber,
  BatchJobEventSubscriber,
 ];

testContainer = registerActuals(testContainer,actualSubscribers as any,"Subscriber");


  
  return testContainer;
}
const resolveAll = (container:AwilixContainer): any=>
  {
    const values  = Object.values(container.registrations);
    const keys  = Object.keys(container.registrations);
    const result = {};
    for (let i = 0;i<keys.length;i++)
    {
    
      const resolvedName =  keys[i];
      if(resolvedName == "container" || resolvedName == "_a")
      {
        continue;
      }
      else if (resolvedName == "mocks")
      {
        for (const key of Object.keys(mocks)) {
          const resolvedConstMock = container.resolve("mocks")[key];
          result[key] = resolvedConstMock;
        }
      }
      const p = values[i];
      result["eventBusService"] = container.resolve<EventBusService>("eventBusService",{
        allowUnregistered:false
      });
      result["productService"] = container.resolve<ProductService>("productService",{
        allowUnregistered:false
      });
      result["__configModule__"] = container.resolve<ConfigModule>("configModule",{
        allowUnregistered:false
      });

      result["config"] = container.resolve<ConfigModule>("configModule",{
        allowUnregistered:false
      });

      if(!p.resolve){
        result[resolvedName] = p;
        continue;
      }
      try{
      if(!result[resolvedName])
      {
      
      const resolvedValue = p.resolve(container);
      result[resolvedName] = resolvedValue;
      }
      }
      catch(e)
      {
        console.log(e.message);
      }
      container.register(resolvedName,asFunction(()=>result[resolvedName]));
    }
    return result;
  };
  
export function getServiceUnderTest(max_num:any,
  enable_vendor_store?:boolean,auto_create_store?:boolean):{services:Record<string,unknown>,
testContainer:AwilixContainer}{
  
  try{
    // resolveAll(testContainer);
    const testContainer = configurContainer();

    const cache = resolveAll(testContainer);/* creating all singleton objects */
    const commonServices = resolveAll(testContainer);
    const options = { ...getOptionsConfig(max_num),enable_vendor_store,auto_create_store } as ClientOptions;
    
  /* initialising dependnet services */
    const shopifyClientService = new ShopifyClientService(
      { ...commonServices
      }
  
      ,options);
  
      const shopifyProductService = new ShopifyProductService(
        {
          ...commonServices,
          shopifyClientService, 
          shopifyRedisService:testContainer.resolve("shopifyRedisService") , 
        },options);
      
        const shopifyCollectionService = new ShopifyCollectionService(
          {
            ...commonServices,
            shopifyProductService,
          },options);
        
        const shopifyService = new ShopifyService(
          {
            ...commonServices,
            shopifyProductService, shopifyCollectionService, shopifyClientService
          },options
        );

  /* loading services into the container */
  testContainer.register("shopifyService",asFunction(()=>shopifyService).singleton());
  testContainer.register("shopifyProductService",asFunction(()=>shopifyProductService).singleton());
  testContainer.register("shopifyCollectionService",asFunction(()=>shopifyCollectionService).singleton());
  testContainer.register("shopifyClientService",asFunction(()=>shopifyClientService).singleton());
  
  testContainer.register("batchType_shopify-import",asClass(ShopifyImportStrategy));
  
  const services = { shopifyService,
    shopifyClientService,
    shopifyCollectionService,
    shopifyProductService };
  
  return { services,testContainer };
  
  
  }
  catch(err ){
  
    const error = err as AwilixResolutionError;
    console.log(error.message,error.stack);
    console.log(err);
  }
  }
  
export function getOptionsConfig(max_num): any{

  return process.env.USE_REAL=="true"?realData(max_num):mockData(max_num);
}

export async function  singleStepBatchJob (
  job: BatchJob,
  container: AwilixContainer,
  done?: any
): Promise<BatchJob>  {
  const eventBusService = container.resolve(
    "eventBusService"
  ) as EventBusService;
  const batchJobService = container.resolve(
    "batchJobService"
  ) as BatchJobService;
  await eventBusService.worker_({
    data: {
      eventName: "batch.confirmed",
      data: job as any,
      completedSubscriberIds: undefined
    },
    update:  (data: any)=>jest.fn().mockImplementation(()=>Promise.resolve()),
    attemptsMade: 0,
    opts: undefined
  });

  //
  const waitForBatchStatusChange = async (
    desiredStatus: BatchJobStatus
  ): Promise<BatchJob> => {
    setTimeout(() => {
      if(done) {done(job);}
    }, 5000);

    job = await batchJobService.retrieve(job.id);
    let status = job.status;
    while (status != desiredStatus) {
      await sleep(5000);
      job = (await batchJobService.retrieve(job.id));
      status = job.status;
    }
    return job;
  };

  //  await waitForBatchStatusChange(BatchJobStatus.PROCESSING);
  const jobResult = await waitForBatchStatusChange(BatchJobStatus.COMPLETED);
  return jobResult;
}
