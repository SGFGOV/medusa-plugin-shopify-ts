import {
  BatchJob,
  BatchJobService,
  BatchJobStatus,
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
          try {
            await this.batchAction(data, event.split(".")[1]);
          } catch (e) {
            this.logger.error(
              "error determining batch status" + (e as Error).message
            );
          }
          try {
            await this.logBatchSummary();
          } catch (e) {
            this.logger.error(
              "error generating shopify batch summary " + (e as Error).message
            );
          }

          return;
        });
      }
    }
  }

  async logDefaultMessage(
    batchJob: BatchJob,
    eventType: string
  ): Promise<void> {
    this.logger.info(
      `Evaluating ${batchJob.type} ${batchJob.id} requested by ${batchJob.created_by} ${eventType}`
    );
  }

  async logBatchSummary(): Promise<void> {
    const jobs = await this.batchJobService.listAndCount(
      {
        type: [ShopifyImportStrategy.batchType],
      },
      {
        take: 1e9,
      }
    );

    const jobList = jobs[0];
    const jobCount = jobs[1];

    const createdJobs = jobList?.filter((job) => {
      return job.status == BatchJobStatus.CREATED;
    });

    const processingJobs = jobList?.filter((job) => {
      return (
        job.status == BatchJobStatus.PROCESSING ||
        job.status == BatchJobStatus.PRE_PROCESSED
      );
    });

    const failedJobs = jobList?.filter((job) => {
      return job.status == BatchJobStatus.FAILED;
    });

    const completedJobs = jobList?.filter((job) => {
      return job.status == BatchJobStatus.COMPLETED;
    });

    const confirmedJobs = jobList?.filter((job) => {
      return job.status == BatchJobStatus.CONFIRMED;
    });

    this.logger.info(`Shopfy Jobs Summary: Total Jobs: ${jobCount}
    created: ${createdJobs?.length ?? 0}
    confirmed: ${confirmedJobs?.length ?? 0}
    processing: ${processingJobs?.length ?? 0}
    completed: ${completedJobs?.length ?? 0},
    failed: ${failedJobs?.length ?? 0} `);
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
      const err = e as Error;
      const errMsg =
        `batch ${data.id} requested by not found` + ` ${JSON.stringify(err)}`;
      this.logger.error(errMsg);
    }
  }
}
export default BatchJobEventSubscriber;
