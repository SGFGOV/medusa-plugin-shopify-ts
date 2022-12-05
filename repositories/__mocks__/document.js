"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentModelMock = exports.documents = void 0;
const medusa_test_utils_1 = require("medusa-test-utils");
exports.documents = [
    {
        _id: medusa_test_utils_1.IdMap.getId("doc"),
        name: "test doc",
        base_64: "verylongstring",
    },
];
exports.DocumentModelMock = {
    findOne: jest.fn().mockImplementation(query => {
        return Promise.resolve(exports.documents[0]);
    }),
};
//# sourceMappingURL=document.js.map