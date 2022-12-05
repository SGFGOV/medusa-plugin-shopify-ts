"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoneyAmountModelMock = exports.moneyAmounts = void 0;
const medusa_test_utils_1 = require("medusa-test-utils");
exports.moneyAmounts = {
    amountOne: {
        id: medusa_test_utils_1.IdMap.getId("amountOne"),
        currency_code: "USD",
        amount: 1,
        min_quantity: 1,
        max_quantity: 10,
        price_list_id: null,
    }
};
exports.MoneyAmountModelMock = {
    create: jest.fn().mockReturnValue(Promise.resolve()),
    findOne: jest.fn().mockImplementation(query => {
        if (query._id === medusa_test_utils_1.IdMap.getId("amountOne")) {
            return Promise.resolve(exports.moneyAmounts.amountOne);
        }
        return Promise.resolve(undefined);
    }),
    addToPriceList: jest.fn().mockImplementation((priceListId, prices, overrideExisting) => {
        return Promise.resolve();
    }),
    deletePriceListPrices: jest.fn().mockImplementation((priceListId, moneyAmountIds) => {
        return Promise.resolve();
    }),
    updatePriceListPrices: jest.fn().mockImplementation((priceListId, updates) => {
        return Promise.resolve();
    }),
};
//# sourceMappingURL=money-amount.js.map