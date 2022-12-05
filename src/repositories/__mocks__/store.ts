import { Store } from "@medusajs/medusa"
import { IdMap } from "medusa-test-utils"

export const store = {"test store":{
  id: IdMap.getId("store"),
  name: "test store",
  currencies: ["DKK"],
},
teststore:{
  id: IdMap.getId("store"),
  name: "teststore",
  currencies: ["DKK"],
}}

const stores = new Map<string,any>()
stores.set("test store",(store["test store"]));
stores.set("teststore",(store["teststore"]));

export const StoreModelMock = {
  create: jest.fn().mockReturnValue(Promise.resolve()),
  updateOne: jest.fn().mockImplementation((query, update) => {
    return Promise.resolve()
  }),
  findOne: jest.fn().mockImplementation(query => {
    return Promise.resolve(stores.get(query.name))
  }),
}
