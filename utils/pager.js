"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pager = void 0;
const sleep_1 = require("@medusajs/medusa/dist/utils/sleep");
async function pager(shopifyService, client, path, shopifyImportRequest, userId, extraHeaders = null, extraQuery = {}, logger, gotPageCallBack) {
    let objects = [];
    let nextPage = null;
    let hasNext = true;
    let pageCount = 0;
    while (hasNext) {
        const params = {
            path,
            query: { page_info: nextPage },
        };
        logger?.info(`fetching page ${pageCount++}`);
        if (extraHeaders) {
            Object.assign(params, { extraHeaders: extraHeaders });
        }
        if (extraQuery) {
            Object.assign(params.query, extraQuery);
        }
        if (!params.query.page_info) {
            delete params.query.page_info;
        }
        const response = await client.get(params);
        /** limiting throttling */
        await (0, sleep_1.sleep)(600);
        objects = [...objects, ...response.body[path]];
        const link = response.headers.get("link");
        const match = /(?:page_info=)(?<page_info>[a-zA-Z0-9]+)(?:>; rel="next")/.exec(link);
        if (match?.groups) {
            nextPage = match.groups["page_info"];
            hasNext = true;
        }
        else {
            hasNext = false;
        }
        if (gotPageCallBack) {
            await gotPageCallBack(shopifyService, objects, shopifyImportRequest, userId, path);
        }
        logger?.debug(`${JSON.stringify(objects)}`);
        if (shopifyImportRequest.max_num_products &&
            objects?.length >= shopifyImportRequest.max_num_products) {
            logger?.info(`completed fetching ${pageCount}`);
            return objects.slice(0, shopifyImportRequest.max_num_products);
        }
    }
    logger?.info(`completed fetching ${pageCount}`);
    return objects;
}
exports.pager = pager;
//# sourceMappingURL=pager.js.map