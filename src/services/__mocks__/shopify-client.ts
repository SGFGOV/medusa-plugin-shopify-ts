import { RestClient } from "@shopify/shopify-api/dist/clients/rest";
import { RestClientMock } from "./rest-client";
import { shopifyProducts } from "./test-products";
const mockedClient: jest.Mocked<RestClient> = RestClientMock as any;
export const ShopifyClientServiceMock = {
  defaultRestClient_: mockedClient,
  get: jest.fn().mockImplementation((params) => {
    if (params.path === "products/ipod") {
      return Promise.resolve(shopifyProducts.ipod);
    }
    if (params.path === "products/new_ipod") {
      return Promise.resolve(shopifyProducts.new_ipod);
    }
    if (params.path === "products/shopify_ipod") {
      return Promise.resolve({
        body: {
          product: shopifyProducts.ipod_update,
        },
      });
    }
    if (params.path === "products/shopify_deleted") {
      return Promise.resolve({
        body: {
          product: {
            ...shopifyProducts.ipod,
            variants: shopifyProducts.ipod.variants.slice(1, -1),
          },
        },
      });
    }
  }),
  list: jest.fn().mockImplementation((path, _headers, _query) => {
    if (path === "products") {
      return Promise.resolve([shopifyProducts.ipod]);
    }
  }),
};
