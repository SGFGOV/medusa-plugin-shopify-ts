import { medusaProducts } from "./test-products";

let enableStoreId;
function returnValueWithStore(store_id): any {
  const returnValue =
    store_id || enableStoreId
      ? { ...medusaProducts.ipod, store_id: store_id }
      : medusaProducts.ipod;
  if (store_id) {
    enableStoreId = true;
  }
  return returnValue;
}

export const ProductServiceMultiStoreMock = {
  withTransaction: function (): any {
    return this;
  },

  create: jest.fn().mockImplementation((data) => {
    if (data.handle === "ipod-nano") {
      return Promise.resolve(returnValueWithStore("mockstore"));
    }
  }),
  update: jest.fn().mockImplementation((_id, _update) => {
    return Promise.resolve(returnValueWithStore("mockstore"));
  }),
  retrieveByExternalId: jest.fn().mockImplementation((id) => {
    if (id === "shopify_ipod") {
      return Promise.resolve(returnValueWithStore("mockstore"));
    }
    if (id === "shopify_deleted") {
      return Promise.resolve(returnValueWithStore("mockstore"));
    }
    return Promise.resolve(undefined);
  }),
  retrieve: jest.fn().mockImplementation((_id, _config) => {
    if (_id === "prod_ipod") {
      return Promise.resolve(returnValueWithStore("mockstore"));
    }
  }),
  addOption: jest.fn().mockImplementation((_id, _title) => {
    return Promise.resolve();
  }),
};
