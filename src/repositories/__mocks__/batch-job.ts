import { BatchJob } from "@medusajs/medusa"
import { randomInt } from "crypto"
import { string } from "joi"
import { IdMap } from "medusa-test-utils"
import { JoinTableMetadataArgs } from "typeorm/metadata-args/JoinTableMetadataArgs"


const eventMap = new Map<string,BatchJob>()

export const BatchJobRepositoryMock = {

  save: jest.fn().mockImplementation((data)=>{
    const job = Object.assign(new BatchJob(),data) as BatchJob
    job.id = "mock_batch_"+randomInt(200)
    eventMap.set(job.id,job)
    return Promise.resolve(eventMap.get(job.id))
  }),
  create: jest.fn().mockImplementation((data)=>{
    const job = Object.assign(new BatchJob(),data) as BatchJob
    eventMap.set(job.id,job)
    return eventMap.get(job.id)
  }),
  updateOne: jest.fn().mockImplementation((query, update) => {
    const job = Object.assign(new BatchJob(),update) as BatchJob
    eventMap.set(query.where.id,job)
    return Promise.resolve(eventMap.get(job.id))
  }),
  findOne: jest.fn().mockImplementation((query) => {
    let value: BatchJob;
   value =  eventMap.get(query.where.id)
       /*eventMap.forEach((event)=>{
          if(event.id == id){
          value  = event;
          }
     })*/
     return Promise.resolve(value);
  }),

  find: jest.fn().mockImplementation(() => {
    const arr = Array.from(eventMap, ([key, value]) => {
      return {[key]: value};
    });
    return arr;
  }),
}
