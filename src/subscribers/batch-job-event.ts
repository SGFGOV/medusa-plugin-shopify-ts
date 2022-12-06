import {
  BatchJob,
  BatchJobService,
  EventBusService,
  StrategyResolverService,
} from "@medusajs/medusa";
import BatchJobSubscriber from "@medusajs/medusa/dist/subscribers/batch-job";
import { Logger } from "@medusajs/medusa/dist/types/global";
import { EntityManager } from "typeorm";

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

    for (const key of Object.keys(batchEvents)) {
      const event = batchEvents[key];
      this.eventbusService_.subscribe(event, async (data: { id: string }) => {
        return await Promise.resolve(
          this.batchAction(data, event.split(".")[1])
        );
      });
    }
  }

  logDefaultMessage(batchJob: BatchJob, eventType: string): void {
    this.logger.info(
      `${batchJob.type} ${batchJob.id} requested by ${batchJob.created_by_user} ${eventType}`
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
          this.logDefaultMessage(batchJob, eventType);
          // await this.batchJobService.setProcessing(data.id);
          break;
        case "processing":
          this.logDefaultMessage(batchJob, eventType);
          break;

        default:
          this.logDefaultMessage(batchJob, eventType);
      }
      return await Promise.resolve();
    } catch (e) {
      const errMsg = `batch ${data.id} requested by not found`;
      this.logger.error(errMsg);
    }
  }
}
export default BatchJobEventSubscriber;
