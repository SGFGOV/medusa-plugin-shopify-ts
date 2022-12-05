"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippingOptionModelMock = exports.options = void 0;
const medusa_test_utils_1 = require("medusa-test-utils");
exports.options = {
    validOption: {
        _id: medusa_test_utils_1.IdMap.getId("validId"),
        name: "Default Option",
        region_id: medusa_test_utils_1.IdMap.getId("fr-region"),
        provider_id: "default_provider",
        data: {
            id: "bonjour",
        },
        requirements: [
            {
                _id: "requirement_id",
                type: "min_subtotal",
                value: 100,
            },
        ],
        price: {
            type: "flat_rate",
            amount: 10,
        },
    },
    noCalc: {
        _id: medusa_test_utils_1.IdMap.getId("noCalc"),
        name: "No Calc",
        region_id: medusa_test_utils_1.IdMap.getId("fr-region"),
        provider_id: "default_provider",
        data: {
            id: "bobo",
        },
        requirements: [
            {
                _id: "requirement_id",
                type: "min_subtotal",
                value: 100,
            },
        ],
        price: {
            type: "flat_rate",
            amount: 10,
        },
    },
};
exports.ShippingOptionModelMock = {
    create: jest.fn().mockReturnValue(Promise.resolve()),
    updateOne: jest.fn().mockImplementation((query, update) => {
        return Promise.resolve();
    }),
    deleteOne: jest.fn().mockReturnValue(Promise.resolve()),
    findOne: jest.fn().mockImplementation(query => {
        if (query._id === medusa_test_utils_1.IdMap.getId("noCalc")) {
            return Promise.resolve(exports.options.noCalc);
        }
        if (query._id === medusa_test_utils_1.IdMap.getId("validId")) {
            return Promise.resolve(exports.options.validOption);
        }
        return Promise.resolve(undefined);
    }),
};
//# sourceMappingURL=shipping-option.js.map