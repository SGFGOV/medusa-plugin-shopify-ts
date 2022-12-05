/* eslint-disable @typescript-eslint/no-explicit-any */

import { BatchJob, BatchJobStatus, EventBusService } from "@medusajs/medusa";
import ShopifyClientService from "../shopify-client";

import ShopifyService from "../shopify";
import { FetchedShopifyData } from "interfaces/interfaces";
import {
  mockedRestClient,
  configurContainer,
  getOptionsConfig,
  getServiceUnderTest,
} from "../__test-helpers__/configure-container";

describe("ShopifyService", () => {
  describe("Testing Shopify Service", () => {
    beforeEach(async () => {
      jest.clearAllMocks();
    });

    it("successfully executes batch creation", async (done) => {
      const servicesUnderTest = getServiceUnderTest(10);
      const testShopifyClient = servicesUnderTest.services
        .shopifyClientService as ShopifyClientService;
      testShopifyClient.setClient(mockedRestClient);

      const doneStartEnqueuer = async (job: BatchJob): Promise<boolean> => {
        const eventBusService = servicesUnderTest.testContainer.resolve(
          "eventBusService"
        ) as EventBusService;
        const result = await eventBusService.worker_({
          data: { eventName: "batch.confirmed", data: job },
        });
        done(job);
        expect(result).toBeDefined();
        expect(result.length).toBe(1);
        expect(job.status).toBe(BatchJobStatus.COMPLETED);
        return true;
      };
      const shopifyService = servicesUnderTest.services
        .shopifyService as ShopifyService;
      const data = (await shopifyService.importIntoStore(
        getOptionsConfig(10),
        doneStartEnqueuer
      )) as FetchedShopifyData;

      /* expect(data).toBeDefined;
      expect(data.products).toBeDefined;
      expect(data.products.length).toBe(max_num_products);
      expect(
        shopifyService.shopifyProductService_.create
      ).toHaveBeenCalledTimes(max_num_products);
    }, 70000);*/
    }, 600000);
  });
});
