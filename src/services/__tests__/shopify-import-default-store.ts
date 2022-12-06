/* eslint-disable @typescript-eslint/no-explicit-any */

import { BatchJob, BatchJobStatus } from "@medusajs/medusa";
import ShopifyClientService from "../shopify-client";

import ShopifyService from "../shopify";
import { FetchedShopifyData } from "interfaces/shopify-interfaces";
import {
  mockedRestClient,
  getOptionsConfig,
  getServiceUnderTest,
  singleStepBatchJob,
} from "../__helpers__/test-helpers";

describe("ShopifyService", () => {
  describe("Testing Shopify Service", () => {
    beforeEach(async () => {
      jest.clearAllMocks();
    });

    it("successfully executes batch creation", async () => {
      const max_num_products = 10;
      const servicesUnderTest = getServiceUnderTest(10);
      const testShopifyClient = servicesUnderTest.services
        .shopifyClientService as ShopifyClientService;
      testShopifyClient.setClient(mockedRestClient);
      const productService =
        servicesUnderTest.testContainer.resolve("productService");
      const simulateEnqueuer = async (job: BatchJob): Promise<boolean> => {
        /** */
        // eventBusService.startEnqueuer();

        const stepResult = await singleStepBatchJob(
          job,
          servicesUnderTest.testContainer
        );
        expect(stepResult.result).toBeDefined();
        expect(stepResult.status).toBe(BatchJobStatus.COMPLETED);
        return true;
      };
      const shopifyService = servicesUnderTest.services
        .shopifyService as ShopifyService;
      const data = (await shopifyService.importIntoStore(
        getOptionsConfig(max_num_products),
        simulateEnqueuer
      )) as FetchedShopifyData;

      expect(data).toBeDefined;
      expect(data.products).toBeDefined;
      expect(data.products.length).toBe(max_num_products);
      expect(productService.create).toHaveBeenCalledTimes(max_num_products);
      return;
    }, 14000);
  });
});
