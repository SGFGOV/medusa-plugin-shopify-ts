import {
  BatchJob,
  BatchJobStatus,
  Logger,
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/medusa";
import { BatchJobService } from "@medusajs/medusa";
import ShopifyImportStrategy from "../strategies/shopify-import";
import { MedusaContainer } from "medusa-core-utils";

export async function logBatchSummary(
  container: MedusaContainer,
  userId: string,
  batchType = ShopifyImportStrategy.batchType
): Promise<void> {
  const logger = container.resolve("logger") as Logger;
  const batchJobService = container.resolve(
    "batchJobService"
  ) as BatchJobService;

  const jobs = await batchJobService.listAndCount(
    {
      type: batchType ? [batchType] : undefined,
      created_by: userId,
    },
    {
      order: { created_at: "DESC" },
      take: 100,
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

  logger.info(`
        Summary of last 100 batch Jobs Summary: Total Jobs of type ${batchType}: ${jobCount}
        created: ${createdJobs?.length ?? 0}
        confirmed: ${confirmedJobs?.length ?? 0}
        processing: ${processingJobs?.length ?? 0}
        completed: ${completedJobs?.length ?? 0},
        failed: ${failedJobs?.length ?? 0} `);
}

async function batchAction(
  batchJob: BatchJob,
  eventType: string,
  container: MedusaContainer
): Promise<void> {
  const logger = container.resolve("logger") as Logger;
  logger.info(
    `${eventType} : Evaluating ${batchJob.type} ${batchJob.id} requested by ${batchJob.created_by}`
  );

  switch (eventType) {
    case BatchJobService.Events.FAILED: {
      const errMsg = ` ${eventType}: ${batchJob.type} ${batchJob.id} owner: ${
        batchJob.created_by_user ?? ""
      }`;
      logger.error(errMsg);
      await logBatchSummary(container, batchJob.created_by);
      // throw new Error(errMsg);
    }
  }
  return;
}

export default async function ShopifyEventsStatusUpdate({
  data,
  container,
  eventName,
}: SubscriberArgs<BatchJob>): Promise<void> {
  const batchJobService = container.resolve(
    "batchJobService"
  ) as BatchJobService;
  // Get the batch job
  const job = await batchJobService.retrieve(data.id);

  if (job.type == ShopifyImportStrategy.batchType) {
    await batchAction(job, eventName, container);
  }
  return;
}

export const config: SubscriberConfig = {
  event: [
    BatchJobService.Events.CREATED,
    BatchJobService.Events.UPDATED,
    BatchJobService.Events.COMPLETED,
    BatchJobService.Events.FAILED,
    BatchJobService.Events.CANCELED,
  ],
};
