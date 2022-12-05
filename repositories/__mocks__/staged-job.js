"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StagedJobRepositoryMock = void 0;
const medusa_1 = require("@medusajs/medusa");
const crypto_1 = require("crypto");
const eventMap = new Map();
exports.StagedJobRepositoryMock = {
    create: jest.fn().mockImplementation((data) => {
        const job = Object.assign(new medusa_1.BatchJob(), data);
        job.id = "mock_stage_" + (0, crypto_1.randomInt)(200);
        eventMap.set(job.id, job);
        return eventMap.get(job.id);
    }),
    save: jest.fn().mockImplementation((data) => {
        const job = Object.assign(new medusa_1.BatchJob(), data);
        eventMap.set(job.id, job);
        return Promise.resolve(eventMap.get(job.id));
    }),
    updateOne: jest.fn().mockReturnValue((query, data) => {
        const job = Object.assign(new medusa_1.BatchJob(), data);
        eventMap.set(job.id, job);
        return eventMap.get(job.id);
    }),
    findOne: jest.fn().mockImplementation((query) => {
        let value;
        value = eventMap.get(query.where.id);
        return Promise.resolve(value);
    }),
    find: jest.fn().mockImplementation((job) => {
        const arr = Array.from(eventMap, ([key, value]) => {
            return { [key]: value };
        });
        return arr;
    }),
    remove: jest.fn().mockImplementation((job) => {
        let value;
        eventMap.delete(job.id);
        return;
    }),
};
//# sourceMappingURL=staged-job.js.map