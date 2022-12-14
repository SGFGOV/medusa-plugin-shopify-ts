import { default as redis, RedisClient } from "redis-mock";
import OverloadedCommand from "ioredis";
import { BulkWriteResult } from "typeorm";
import { Job } from "bull";
import { EventEmitter } from "events";

import { default as IORedisMock } from "ioredis-mock";
import { isOrder } from "@medusajs/medusa/dist/types/orders";
import { Redis } from "ioredis";
import _ from "lodash";
const ioredisInstance = new IORedisMock();

type Callback<T> = (err: Error | null, res: T) => void;

const RedisMock = redis.createClient();

RedisMock.info = (section?: any, cb?: Callback<any>): any => {
  return Promise.resolve(true);
};

jest.mock;

const mockedCommandFunctions = <T, U, R>(
  arg1?: T,
  arg2?: T,
  arg3?: T,
  arg4?: T,
  arg5?: T,
  arg6?: T,
  cb?: Callback<U>
): R => {
  return 1 as R;
};

/* {/return  {
    (arg1: T, arg2: T, arg3: T, arg4: T, arg5: T, arg6: T, cb?: Callback<U>): R =>{ return 1 as R };
    (arg1: T, arg2: T, arg3: T, arg4: T, arg5: T, cb?: Callback<U>): R =>{ return 1 as R };;
    (arg1: T, arg2: T, arg3: T, arg4: T, cb?: Callback<U>): R =>{ return 1 as R };;
    (arg1: T, arg2: T, arg3: T, cb?: Callback<U>): R =>{ return 1 as R };;
    (arg1: T, arg2: T | T[], cb?: Callback<U>): R =>{ return 1 as R };;
    (arg1: T | T[], cb?: Callback<U>): R =>{ return 1 as R };;
    (...args: Array<T | Callback<U>>): R =>{ return 1 as R };;

}}

*/

export type HandlerFunction = {
  name: string;
  (data: unknown, eventName: string): Promise<void>;
};
const eventMap = new Map<string, HandlerFunction>();
RedisMock.client = mockedCommandFunctions;
RedisMock["addJob"] = (c: []): Job => {
  return c;
};
// eslint-disable-next-line @typescript-eslint/no-empty-function
RedisMock["defineCommand"] = (cmd: any, string: any): void => {};
RedisMock["on"] = (event, handler): RedisClient => {
  eventMap.set(event, handler);
  return RedisMock as RedisClient;
};
// RedisMock.defined = mockedCommandFunctions;
/* RedisMock.info.then = (value: any): any => {
  return value;
};*/

const eventEmitter = new EventEmitter({
  captureRejections: true,
});

const client = new IORedisMock() as Redis;
eventEmitter.setMaxListeners(Infinity);
client["on"] = eventEmitter.on as any;
client["once"] = eventEmitter.once as any;
const mockClient = _.cloneDeep(client);
mockClient["options"] = {};
mockClient["client"] = (): any => {
  return "OK" as any;
};

export default mockClient;
