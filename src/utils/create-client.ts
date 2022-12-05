import Shopify from "@shopify/shopify-api";
import { RestClient } from "@shopify/shopify-api/dist/clients/rest";
import { ClientOptions } from "interfaces/interfaces";

export const createClient = (options: ClientOptions): RestClient => {
  const { store_domain: domain, api_key } = options;

  return (
    options.defaultClient ??
    new Shopify.Clients.Rest(`${domain}.myshopify.com`, api_key)
  );
};
