import { medusaProducts } from "./test-products";

export const ShopifyProductServiceMock = {
  withTransaction: function () {
    return this;
  },
  create: jest.fn().mockImplementation((_data, store_id) => {
    const result = store_id
      ? { ...medusaProducts.ipod, store_id }
      : medusaProducts.ipod;
    return Promise.resolve(result);
  }),
};
