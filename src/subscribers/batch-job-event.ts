import {
  BatchJob,
  BatchJobService,
  EventBusService,
  StrategyResolverService,
} from "@medusajs/medusa";
import { Logger } from "@medusajs/medusa/dist/types/global";
import ShopifyImportStrategy from "../strategies/shopify-import";
import { EntityManager } from "typeorm";

export const ShopifyEvents = {
  "Shopify.batch.created": "SHOPIFY_BATCH_CREATED",
  "Shopify.batch.confirmed": "SHOPIFY_BATCH_CONFIRMED",
  "Shopify.batch.failed": "SHOPIFY_BATCH_FAILED",
};

export interface ContainerProps {
  logger: Logger;
  eventBusService: EventBusService;
  batchJobService: BatchJobService;
  strategyResolverService: StrategyResolverService;
  manager: EntityManager;
}
class BatchJobEventSubscriber {
  eventbusService_: EventBusService;
  batchJobService: BatchJobService;
  strategyResolverService: StrategyResolverService;
  manager: EntityManager;
  logger: Logger;

  constructor(readonly container: ContainerProps) {
    const batchEvents = BatchJobService.Events;
    this.eventbusService_ = container.eventBusService;
    this.batchJobService = container.batchJobService;
    this.logger = container.logger;
    this.manager = container.manager;
    const eventsOfInterest = [...Object.values(batchEvents)];

    for (const key of Object.keys(batchEvents)) {
      const event = batchEvents[key];
      if (eventsOfInterest.indexOf(event) >= 0) {
        this.eventbusService_.subscribe(event, async (data: { id: string }) => {
          await this.batchAction(data, event.split(".")[1]);
          return;
        });
      }
    }
  }

  async logDefaultMessage(
    batchJob: BatchJob,
    eventType: string
  ): Promise<void> {
    const jobsInQueue = await this.batchJobService.listAndCount({
      type: [ShopifyImportStrategy.batchType],
    });

    this.logger.info(
      `Processing 1 of ${jobsInQueue[0].length} shopify batch jobs,` +
        `${batchJob.type} ${batchJob.id} requested by ${batchJob.created_by} ${eventType}`
    );
  }
  async batchAction(data: { id: string }, eventType: string): Promise<void> {
    try {
      const batchJob = await this.manager.transaction(
        "READ UNCOMMITTED",
        async (manager) => {
          return await this.batchJobService
            .withTransaction(manager)
            .retrieve(data.id);
        }
      );

      switch (eventType) {
        case "failed": {
          const errMsg = `${batchJob.type} ${batchJob.id} owner: ${
            batchJob.created_by_user ?? ""
          } ${eventType}`;
          this.logger.error(errMsg);
          throw new Error(errMsg);
        }
        case "confirmed":
          await this.logDefaultMessage(batchJob, eventType);
          // await this.batchJobService.setProcessing(data.id);
          break;
        case "processing":
          await this.logDefaultMessage(batchJob, eventType);
          break;

        default:
          await this.logDefaultMessage(batchJob, eventType);
      }
      return;
    } catch (e) {
      const errMsg = `batch ${data.id} requested by not found`;
      this.logger.error(errMsg);
    }
  }
}
export default BatchJobEventSubscriber;
