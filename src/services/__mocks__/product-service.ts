import { medusaProducts } from "./test-products";

const dataStore = new Map<string, any>();

export const ProductServiceMock = {
  withTransaction: function (): any {
    return this;
  },
  create: jest.fn().mockImplementation((data: any) => {
    if (data.handle === "ipod-nano") {
      return Promise.resolve(medusaProducts.ipod);
    } else {
      const id = "prod_" + data.external_id;
      dataStore.set(id, { id, ...data });
      return Promise.resolve(dataStore.get(id));
    }
  }),
  update: jest.fn().mockImplementation((_id, _update) => {
    return Promise.resolve(medusaProducts.ipod);
  }),
  retrieveByExternalId: jest.fn().mockImplementation((id) => {
    if (id === "shopify_ipod") {
      return Promise.resolve(medusaProducts.ipod);
    }
    if (id === "shopify_deleted") {
      return Promise.resolve(medusaProducts.ipod);
    }
    return Promise.resolve(dataStore.get("prod_" + id));
  }),
  retrieve: jest.fn().mockImplementation((_id, _config) => {
    if (_id === "prod_ipod") {
      return Promise.resolve(medusaProducts.ipod);
    } else {
      return Promise.resolve(dataStore.get(_id));
    }
  }),
  addOption: jest.fn().mockImplementation((_id, _title) => {
    return Promise.resolve();
  }),
  updateOption: jest.fn().mockImplementation((_id, _title) => {
    return Promise.resolve();
  }),
};
