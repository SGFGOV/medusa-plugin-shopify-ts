"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscountModelMock = exports.discounts = void 0;
const medusa_test_utils_1 = require("medusa-test-utils");
exports.discounts = {
    dynamic: {
        _id: medusa_test_utils_1.IdMap.getId("dynamic"),
        code: "Something",
        is_dynamic: true,
        rule: {
            type: "percentage",
            allocation: "total",
            value: 10,
        },
        regions: [medusa_test_utils_1.IdMap.getId("region-france")],
    },
    total10Percent: {
        _id: medusa_test_utils_1.IdMap.getId("total10"),
        code: "10%OFF",
        rule: {
            type: "percentage",
            allocation: "total",
            value: 10,
        },
        regions: [medusa_test_utils_1.IdMap.getId("region-france")],
    },
    item10Percent: {
        _id: medusa_test_utils_1.IdMap.getId("item10Percent"),
        code: "MEDUSA",
        rule: {
            type: "percentage",
            allocation: "item",
            value: 10,
        },
        regions: [medusa_test_utils_1.IdMap.getId("region-france")],
    },
    total10Fixed: {
        _id: medusa_test_utils_1.IdMap.getId("total10Fixed"),
        code: "MEDUSA",
        rule: {
            type: "fixed",
            allocation: "total",
            value: 10,
        },
        regions: [medusa_test_utils_1.IdMap.getId("region-france")],
    },
    item9Fixed: {
        _id: medusa_test_utils_1.IdMap.getId("item9Fixed"),
        code: "MEDUSA",
        rule: {
            type: "fixed",
            allocation: "item",
            value: 9,
        },
        regions: [medusa_test_utils_1.IdMap.getId("region-france")],
    },
    item2Fixed: {
        _id: medusa_test_utils_1.IdMap.getId("item2Fixed"),
        code: "MEDUSA",
        rule: {
            type: "fixed",
            allocation: "item",
            value: 2,
        },
        regions: [medusa_test_utils_1.IdMap.getId("region-france")],
    },
    item10FixedNoVariants: {
        _id: medusa_test_utils_1.IdMap.getId("item10FixedNoVariants"),
        code: "MEDUSA",
        rule: {
            type: "fixed",
            allocation: "item",
            value: 10,
        },
        regions: [medusa_test_utils_1.IdMap.getId("region-france")],
    },
    expiredDiscount: {
        _id: medusa_test_utils_1.IdMap.getId("expired"),
        code: "MEDUSA",
        ends_at: new Date("December 17, 1995 03:24:00"),
        rule: {
            type: "fixed",
            allocation: "item",
            value: 10,
        },
        regions: [medusa_test_utils_1.IdMap.getId("region-france")],
    },
    freeShipping: {
        _id: medusa_test_utils_1.IdMap.getId("freeshipping"),
        code: "FREESHIPPING",
        rule: {
            type: "free_shipping",
            allocation: "total",
            value: 10,
        },
        regions: [medusa_test_utils_1.IdMap.getId("region-france")],
    },
    USDiscount: {
        _id: medusa_test_utils_1.IdMap.getId("us-discount"),
        code: "US10",
        rule: {
            type: "free_shipping",
            allocation: "total",
            value: 10,
        },
        regions: [medusa_test_utils_1.IdMap.getId("us")],
    },
    alreadyExists: {
        code: "ALREADYEXISTS",
        rule: {
            type: "percentage",
            allocation: "total",
            value: 20,
        },
        regions: [medusa_test_utils_1.IdMap.getId("fr-cart")],
    },
};
exports.DiscountModelMock = {
    create: jest.fn().mockImplementation((data) => Promise.resolve(data)),
    updateOne: jest.fn().mockImplementation((query, update) => {
        return Promise.resolve();
    }),
    deleteOne: jest.fn().mockReturnValue(Promise.resolve()),
    findOne: jest.fn().mockImplementation((query) => {
        if (query._id === medusa_test_utils_1.IdMap.getId("dynamic")) {
            return Promise.resolve(exports.discounts.dynamic);
        }
        if (query._id === medusa_test_utils_1.IdMap.getId("total10")) {
            return Promise.resolve(exports.discounts.total10Percent);
        }
        if (query._id === medusa_test_utils_1.IdMap.getId("item10Percent")) {
            return Promise.resolve(exports.discounts.item10Percent);
        }
        if (query._id === medusa_test_utils_1.IdMap.getId("total10Fixed")) {
            return Promise.resolve(exports.discounts.total10Fixed);
        }
        if (query._id === medusa_test_utils_1.IdMap.getId("item2Fixed")) {
            return Promise.resolve(exports.discounts.item2Fixed);
        }
        if (query._id === medusa_test_utils_1.IdMap.getId("item10FixedNoVariants")) {
            return Promise.resolve(exports.discounts.item10FixedNoVariants);
        }
        if (query._id === medusa_test_utils_1.IdMap.getId("expired")) {
            return Promise.resolve(exports.discounts.expiredDiscount);
        }
        if (query.code === "10%OFF") {
            return Promise.resolve(exports.discounts.total10Percent);
        }
        if (query.code === "aLrEaDyExIsts") {
            return Promise.resolve(exports.discounts.alreadyExists);
        }
        return Promise.resolve(undefined);
    }),
};
//# sourceMappingURL=discount.js.map