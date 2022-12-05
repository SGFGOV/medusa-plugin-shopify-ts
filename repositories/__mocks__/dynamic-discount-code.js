"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicDiscountCodeModelMock = exports.dynamicDiscounts = void 0;
const medusa_test_utils_1 = require("medusa-test-utils");
exports.dynamicDiscounts = {
    dynamicOff: {
        _id: medusa_test_utils_1.IdMap.getId("dynamicOff"),
        discount_id: medusa_test_utils_1.IdMap.getId("dynamic"),
        code: "DYNAMICOFF",
        disabled: false,
        usage_count: 0,
    },
};
exports.DynamicDiscountCodeModelMock = {
    create: jest.fn().mockReturnValue(Promise.resolve()),
    updateOne: jest.fn().mockImplementation((query, update) => {
        return Promise.resolve();
    }),
    deleteOne: jest.fn().mockReturnValue(Promise.resolve()),
    findOne: jest.fn().mockImplementation(query => {
        if (query.code === "DYNAMICOFF") {
            return Promise.resolve(exports.dynamicDiscounts.dynamicOff);
        }
        return Promise.resolve(undefined);
    }),
};
//# sourceMappingURL=dynamic-discount-code.js.map