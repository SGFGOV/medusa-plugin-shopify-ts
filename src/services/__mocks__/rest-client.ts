import { string } from "joi";
import mock_products from "../__fixtures__/test-data_products.fixture";
import mock_collects from "../__fixtures__/test-data-collection-2.fixtures";
import mock_smart_collects from "../__fixtures__/test-data-smart-collections";
import mock_custom_collects from "../__fixtures__/test-data-custom-collections";
export const RestClientMock = {
  get: jest
    .fn()
    .mockImplementation(async (params: { path: string; data: any }) => {
      switch (params.path) {
        case "products":
          return Promise.resolve({
            body: { products: mock_products },
            headers: { get: jest.fn(() => Promise.resolve({ link: "" })) },
          });
        case "collects":
          return Promise.resolve({
            body: { collects: mock_collects },
            headers: { get: jest.fn(() => Promise.resolve({ link: "" })) },
          });
        case "smart_collections":
          return Promise.resolve({
            body: { smart_collections: mock_smart_collects },
            headers: { get: jest.fn(() => Promise.resolve({ link: "" })) },
          });
        case "custom_collections":
          return Promise.resolve({
            body: { custom_collections: mock_custom_collects },
            headers: { get: jest.fn(() => Promise.resolve({ link: "" })) },
          });
      }
    }),
};
