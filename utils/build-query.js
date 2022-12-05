"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildQuery = void 0;
function buildQuery(query) {
    let path = "";
    if (query) {
        const queryString = Object.entries(query).map(([key, value]) => {
            return `${key}=${value}`;
        });
        path = `?${queryString.join("&")}`;
    }
    return path;
}
exports.buildQuery = buildQuery;
//# sourceMappingURL=build-query.js.map