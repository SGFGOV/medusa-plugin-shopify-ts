"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreModelMock = exports.store = void 0;
const medusa_test_utils_1 = require("medusa-test-utils");
exports.store = {
    _id: medusa_test_utils_1.IdMap.getId("store"),
    name: "test store",
    currencies: ["DKK"],
};
exports.StoreModelMock = {
    create: jest.fn().mockReturnValue(Promise.resolve()),
    updateOne: jest.fn().mockImplementation((query, update) => {
        return Promise.resolve();
    }),
    findOne: jest.fn().mockImplementation(query => {
        return Promise.resolve(exports.store);
    }),
};
//# sourceMappingURL=store.js.map