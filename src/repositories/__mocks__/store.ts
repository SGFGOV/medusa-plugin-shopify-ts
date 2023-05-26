import { Store } from "@medusajs/medusa"
import { IdMap } from "medusa-test-utils"

type StoreMock ={
  id:string;
  name:string;
  currencies:string[],
  default_currency:"INR",
} 
type StoreMockList = Record<string,StoreMock>

export const store:StoreMockList = {"test store":{
  id: IdMap.getId("store"),
  name: "test store",
  currencies: ["DKK","INR"],
  default_currency:"INR"
},
teststore:{
  id: IdMap.getId("teststore"),
  name: "teststore",
  currencies: ["DKK"],
  default_currency:"INR",
},
dummyStore:{
  id: IdMap.getId("dummyStore"),
  name: "teststore",
  currencies: ["DKK"],
  default_currency:"INR",
}}

const stores = new Map<string,any>()
stores.set("test store",(store["test store"]));
stores.set("teststore",(store["teststore"]));

export const StoreModelMock = {
  create: jest.fn().mockImplementation((storenamr)=>{
    const result = {
      id: IdMap.getId(storenamr),
      name: "storenamr",
      currencies: ["DKK","INR"],
      default_currency:"INR"
    }
    stores.set(storenamr,result);
    return Promise.resolve(result)}),
  updateOne: jest.fn().mockImplementation((query, update) => {
    return Promise.resolve()
  }),
  findOne: jest.fn().mockImplementation(query => {
    if(query.where.name){
    const result = stores.get(query.where.name)
    if(!result)
    {
      
    }
    return Promise.resolve(result)
    }
    if(query.where.id)
    { let result:StoreMock;
      stores.forEach((value)=>
      {
        if(value.id == query.where.id){
        result = value;
        }
      })
      return Promise.resolve(result)
    }
  }),
}
