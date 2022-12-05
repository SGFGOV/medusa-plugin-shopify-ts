import { BatchJob as StagedJob } from "@medusajs/medusa"
import { randomInt } from "crypto"
import { string } from "joi"
import { IdMap } from "medusa-test-utils"
import { JoinTableMetadataArgs } from "typeorm/metadata-args/JoinTableMetadataArgs"


const eventMap = new Map<string,StagedJob>()

export const StagedJobRepositoryMock = {
  create: jest.fn().mockImplementation((data:{event_name: string,
    data: any})=>{
    const job = Object.assign(new StagedJob(),data) as StagedJob
    job.id = "mock_stage_"+randomInt(200)
    eventMap.set(job.id,job)
    return eventMap.get(job.id)
  }),
  save: jest.fn().mockImplementation((data)=>{
    const job = Object.assign(new StagedJob(),data) as StagedJob
    eventMap.set(job.id,job)
    return Promise.resolve(eventMap.get(job.id))
  }),
  updateOne: jest.fn().mockReturnValue((query,data)=>{
    const job = Object.assign(new StagedJob(),data) as StagedJob
    eventMap.set(job.id,job)
    return eventMap.get(job.id)
  }),
  findOne: jest.fn().mockImplementation((query) => {
    let value: StagedJob;
   value =  eventMap.get(query.where.id)
     return Promise.resolve(value)}),
  find: jest.fn().mockImplementation((job:StagedJob) => {
    const arr = Array.from(eventMap, ([key, value]) => {
      return {[key]: value};
    });
    return arr;
  }),
  remove: jest.fn().mockImplementation((job) => {
    let value:StagedJob
    eventMap.delete(job.id)
    
     return ;
  }),
  
}
