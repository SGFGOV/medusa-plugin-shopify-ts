/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  ShopifyFetchRequest,
  ShopifyPath,
} from "interfaces/shopify-interfaces";
import {
  getOptionsConfig,
  getServiceUnderTest,
} from "../__helpers__/test-helpers";
import Redis from "ioredis-mock";
import ShopifyService from "services/shopify";

describe("ShopifyService", () => {
  describe("Testing Shopify Service", () => {
    beforeEach(async () => {
      jest.clearAllMocks();
    });
    afterEach((done) => {
      new Redis().flushall().then(() => done());
    });

    const testImportsFromShopify = async (
      category: ShopifyPath,
      max_num: number
    ): Promise<any> => {
      //  testContainer.registrations.container.resolve(testContainer);
      const serviceUnderTest = getServiceUnderTest(20);
      const shopifyService = serviceUnderTest.services
        .shopifyService as ShopifyService;

      const clientOptions = getOptionsConfig(max_num);

      const shopifyFetchRequest: ShopifyFetchRequest = {
        ...clientOptions,
        requestId: "testFetchRequest",
      };

      return await shopifyService.fetchFromShopifyAndProcessSingleCategory(
        shopifyFetchRequest,
        category
      );
    };

    const verify = (data: any, max_num_products): void => {
      expect(data).toBeDefined;
      expect(data.length).toBeLessThanOrEqual(max_num_products);
    };

    const testFetch = (path: ShopifyPath, num_records = 10): void => {
      it(`succesfully fetches ${path.replace("_", " ")} Shopify`, async () => {
        const data = await testImportsFromShopify(path, num_records);
        verify(data, num_records);
      }, 10000);
    };

    testFetch("collects");
    testFetch("smart_collections");
    testFetch("custom_collections");
    testFetch("products");
  });
});
