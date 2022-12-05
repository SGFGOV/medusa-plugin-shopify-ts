"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerModelMock = exports.customers = void 0;
const medusa_test_utils_1 = require("medusa-test-utils");
exports.customers = {
    testCustomer: {
        _id: medusa_test_utils_1.IdMap.getId("testCustomer"),
        email: "oliver@medusa.com",
        first_name: "Oliver",
        last_name: "Juhl",
        billingAddress: {},
        password_hash: "123456789",
    },
    deleteCustomer: {
        _id: medusa_test_utils_1.IdMap.getId("deleteId"),
        email: "oliver@medusa.com",
        first_name: "Oliver",
        last_name: "Juhl",
        billingAddress: {},
        password_hash: "123456789",
    },
    customerWithPhone: {
        _id: medusa_test_utils_1.IdMap.getId("customerWithPhone"),
        email: "oliver@medusa.com",
        first_name: "Oliver",
        last_name: "Juhl",
        billingAddress: {},
        password_hash: "123456789",
        phone: "12345678",
    },
};
exports.CustomerModelMock = {
    create: jest.fn().mockReturnValue(Promise.resolve()),
    updateOne: jest.fn().mockImplementation((query, update) => {
        return Promise.resolve();
    }),
    deleteOne: jest.fn().mockReturnValue(Promise.resolve()),
    findOne: jest.fn().mockImplementation(query => {
        if (query.email === "oliver@medusa.com") {
            return Promise.resolve(exports.customers.testCustomer);
        }
        if (query.phone === "12345678") {
            return Promise.resolve(exports.customers.customerWithPhone);
        }
        if (query._id === medusa_test_utils_1.IdMap.getId("testCustomer")) {
            return Promise.resolve(exports.customers.testCustomer);
        }
        if (query._id === medusa_test_utils_1.IdMap.getId("deleteId")) {
            return Promise.resolve(exports.customers.deleteCustomer);
        }
        return Promise.resolve(undefined);
    }),
};
//# sourceMappingURL=customer.js.map