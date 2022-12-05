"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippingProfileModelMock = exports.profiles = void 0;
const medusa_test_utils_1 = require("medusa-test-utils");
exports.profiles = {
    validProfile: {
        _id: medusa_test_utils_1.IdMap.getId("validId"),
        name: "Default Profile",
        products: [medusa_test_utils_1.IdMap.getId("validId")],
        shipping_options: [medusa_test_utils_1.IdMap.getId("validId")],
    },
    profile1: {
        _id: medusa_test_utils_1.IdMap.getId("profile1"),
        name: "Profile One",
        products: [medusa_test_utils_1.IdMap.getId("product1")],
        shipping_options: [medusa_test_utils_1.IdMap.getId("shipping_1")],
    },
    profile2: {
        _id: medusa_test_utils_1.IdMap.getId("profile2"),
        name: "Profile two",
        products: [medusa_test_utils_1.IdMap.getId("product2")],
        shipping_options: [medusa_test_utils_1.IdMap.getId("shipping_2")],
    },
};
exports.ShippingProfileModelMock = {
    create: jest.fn().mockReturnValue(Promise.resolve()),
    updateOne: jest.fn().mockImplementation((query, update) => {
        return Promise.resolve();
    }),
    find: jest.fn().mockImplementation(query => {
        if (query.products && query.products.$in) {
            return Promise.resolve([exports.profiles.profile1, exports.profiles.profile2]);
        }
        return Promise.resolve([]);
    }),
    deleteOne: jest.fn().mockReturnValue(Promise.resolve()),
    findOne: jest.fn().mockImplementation(query => {
        if (query.shipping_options === medusa_test_utils_1.IdMap.getId("validId")) {
            return Promise.resolve(exports.profiles.validProfile);
        }
        if (query.products === medusa_test_utils_1.IdMap.getId("validId")) {
            return Promise.resolve(exports.profiles.validProfile);
        }
        if (query._id === medusa_test_utils_1.IdMap.getId("validId")) {
            return Promise.resolve(exports.profiles.validProfile);
        }
        if (query._id === medusa_test_utils_1.IdMap.getId("profile1")) {
            return Promise.resolve(exports.profiles.profile1);
        }
        return Promise.resolve(undefined);
    }),
};
//# sourceMappingURL=shipping-profile.js.map