"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchJobRepositoryMock = void 0;
const medusa_1 = require("@medusajs/medusa");
const crypto_1 = require("crypto");
const eventMap = new Map();
exports.BatchJobRepositoryMock = {
    save: jest.fn().mockImplementation((data) => {
        const job = Object.assign(new medusa_1.BatchJob(), data);
        job.id = "mock_batch_" + (0, crypto_1.randomInt)(200);
        eventMap.set(job.id, job);
        return Promise.resolve(eventMap.get(job.id));
    }),
    create: jest.fn().mockImplementation((data) => {
        const job = Object.assign(new medusa_1.BatchJob(), data);
        eventMap.set(job.id, job);
        return eventMap.get(job.id);
    }),
    updateOne: jest.fn().mockImplementation((query, update) => {
        const job = Object.assign(new medusa_1.BatchJob(), update);
        eventMap.set(query.where.id, job);
        return Promise.resolve(eventMap.get(job.id));
    }),
    findOne: jest.fn().mockImplementation((query) => {
        let value;
        value = eventMap.get(query.where.id);
        /*eventMap.forEach((event)=>{
           if(event.id == id){
           value  = event;
           }
      })*/
        return Promise.resolve(value);
    }),
    find: jest.fn().mockImplementation(() => {
        const arr = Array.from(eventMap, ([key, value]) => {
            return { [key]: value };
        });
        return arr;
    }),
};
//# sourceMappingURL=batch-job.js.map