import { asValue } from "awilix";

const collections = new Map<string, any>();

export const ProductCollectionServiceMock = {
  withTransaction: function () {
    return this;
  },
  create: jest.fn().mockImplementation((data) => {
    const id = `col_${data.metadata.sh_id}`;
    collections.set(id, data);
    const dataReturned = collections.get(id);
    return Promise.resolve({
      id,
      ...dataReturned,
    });
  }),
  retrieveByHandle: jest.fn().mockImplementation((handle) => {
    const list = Array(collections.keys()) as undefined as string[];

    for (const key of list) {
      if (collections[key]?.handle == handle) {
        return Promise.resolve(collections[key]);
      }
    }
    return Promise.resolve();
  }),
  addProducts: jest.fn().mockImplementation((id, products) => {
    return Promise.resolve();
  }),
};
