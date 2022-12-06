import { randomInt } from "crypto";

export const store = {
  id: "test-store",
  name: "Test store",
  currencies: ["DKK", "SEK", "GBP", "INR"],
  default_currency: "INR",
};

let storeNumber = 0;
const stores = new Map<string, any>();
export const StoreServiceMock = {
  withTransaction: function (): any {
    return this;
  },
  create: jest.fn().mockImplementation(() => {
    const id = "test_store_" + storeNumber++;
    stores.set(id, {
      ...store,
      id,
    });
    return Promise.resolve(stores.get(id));
  }),
  addCurrency: jest.fn().mockImplementation((data) => {
    return Promise.resolve();
  }),
  removeCurrency: jest.fn().mockImplementation((data) => {
    return Promise.resolve();
  }),
  update: jest.fn().mockImplementation((data) => {
    const theStore = stores.get(data.id);
    if (!theStore) {
      return Promise.resolve();
    }
    const newData = {
      ...theStore,
      ...data,
    };
    stores.set(data.id, newData);
    return Promise.resolve(stores.get(data.id));
  }),
  retrieve: jest.fn().mockImplementation((data) => {
    return Promise.resolve(store);
  }),
};

const mock = jest.fn().mockImplementation(() => {
  return StoreServiceMock;
});

export default mock;
