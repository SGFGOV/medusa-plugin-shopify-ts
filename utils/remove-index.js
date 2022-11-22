"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeIndex = void 0;
function removeIndex(arr, obj) {
    const index = arr.indexOf(obj);
    arr.splice(index, 1);
}
exports.removeIndex = removeIndex;
