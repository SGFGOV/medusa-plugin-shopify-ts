"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = void 0;
const shopify_api_1 = __importDefault(require("@shopify/shopify-api"));
const createClient = (options) => {
    const { store_domain: domain, api_key } = options;
    return (options.defaultClient ??
        new shopify_api_1.default.Clients.Rest(`${domain}.myshopify.com`, api_key));
};
exports.createClient = createClient;
//# sourceMappingURL=create-client.js.map