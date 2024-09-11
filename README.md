<!--lint disable awesome-list-item-->


# Medusa Plugin Shopify in Typescript

Typicall shopify stores can have from between a few 100 products to millions of products. We found syncing large stores difficult, so we built an upgraded pluging that takes advantage of medusa's batch processing capabilities to sync between the medusa store and shopify.
Each page retrieved from shopify is treated as a batch for processing later. 

## Getting started

Nothing much here, just install the plugin like any other plugin, 


## Installation and configuration

```bash
yarn add medusa-plugin-shopify-ts
```
```
// In medusa-config.js

{
    resolve:'medusa-plugin-shopify-ts'
    options:{
        api_key : #"<Your default shopify private app admin api key>
        store_domain: #"<Your default shopify domain without the myshopify.com part for example :abc.myshopify.com will be abc>",
        default_store_name: #"default_store_name"
        }
    }


```

# Triggering the sync,

This plugin takes advantage of the event bus system that medusa offers, So the best way to trigger the sync is to listen for the event, and resolve the shopify service and call sync. Here is a simplified implementation of how you can do this 

You need to define this function in any service that imports the shopifyService
```
async syncWithShopify(
        clientOptions?: Partial<ClientOptions>,
        requesterEmail?: string
    ): Promise<boolean> {
        return await this.atomicPhase_(async (manager) => {
            // return true;
            const importOptions: ClientOptions = {
                ...this.shopifyService_.options /* default store */,
                ...(clientOptions ?? {}), /*options passed to create local client. This client overrides the global client*/

                enable_vendor_store:
                    clientOptions?.enable_vendor_store ?? false, // enable to automatically create stores from vendor names
                auto_create_store: clientOptions?.auto_create_store ?? false,
                medusa_store_admin_email:
                    requesterEmail ?? this.serviceAccount.email,
                handleMetafields: async (
                    container: MedusaContainer,
                    product: Product,
                    metafields: Record<string, any>
                ) => {
                    const productService = container.resolve(
                        "productService"
                    ) as ProductService;
                    const productToUpdate = await productService.retrieve(
                        product.id
                    );
                    const updatedProduct = await productService.update(
                        productToUpdate.id,
                        {
                            metadata: {
                                ...productToUpdate.metadata,
                                imported_metadata: metafields
                            }
                        }
                    );
                }
            };
            await this.shopifyService_
                .withTransaction(manager)
                .importIntoStore(
                    importOptions,
                    (job: BatchJob): Promise<void> => {
                        this.logger.info(
                            `${
                                job.id
                            } created with import options ${JSON.stringify(
                                importOptions
                            )}`
                        );
                        return;
                    }
                );

            await this.atomicPhase_(async (manager) => {
                return await this.eventBusService
                    .withTransaction(manager)
                    .emit("medusa.shopify.sync.completed", {});
            });
            return true;
        });
    }

```
The sync with shopify is triggered in response to a startup completion event, or any other event you'd like
Here is the full service implementation

```
import {
    BatchJob,
    EventBusService,
    TransactionBaseService
} from "@medusajs/medusa";
import { ConfigModule } from "@medusajs/medusa/dist/types/global";
import { default as ShopifyService } from "medusa-plugin-shopify-ts/services/shopify";
import { EntityManager } from "typeorm";
import { Service } from "medusa-extender";
import { Logger } from "@medusajs/medusa/dist/types/global";

export interface PostStartupActionServiceProps {
    manager: EntityManager;
    eventBusService: EventBusService;
    shopifyService: ShopifyService;
    configModule: ConfigModule;
    logger: Logger;
}

class PostStartupActionService extends TransactionBaseService {
    protected manager_: EntityManager;
    protected transactionManager_: EntityManager;
    shopifyService_: ShopifyService;
    readonly container: PostStartupActionServiceProps;
    protected configModule: ConfigModule;
    protected readonly configModule_: ConfigModule;
    static resolutionKey = "postStartupActionService";
    eventBusService: EventBusService;
    logger: Logger;
    constructor(container: PostStartupActionServiceProps) {
        super(container);

        this.manager_ = container.manager;
        this.container = container;
        this.configModule = container.configModule;
        this.shopifyService_ = container.shopifyService;
        this.eventBusService = container.eventBusService;
        this.logger = container.logger;
    }

    withTransaction(transactionManager: EntityManager): this {
        if (!transactionManager) {
            return this;
        }

        const cloned = new PostStartupActionService({
            ...this.container,
            manager: transactionManager
        });

        cloned.transactionManager_ = transactionManager;

        return cloned as this;
    }
        // define syncWithShopify as shown above here <---->
    }

export default PostStartupActionService;
```

## Api

The plugin also exposes to api (experimental)

"/save-shopify-products", --retrieves and  saves the products

"/fetch-shopify-products", -- retrived the products from shopify. 



## Support us 

As much as we love FOSS software, nothing in this world is truely free. We'll be grateful if you can buy our team a coffee (https://www.buymeacoffee.com/uMRqW9NmS9). 