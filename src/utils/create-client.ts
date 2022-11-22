import Shopify from "@shopify/shopify-api"
import { RestClient } from "@shopify/shopify-api/dist/clients/rest"


export interface Options{

  domain:string;
  api_key:string;

}


export const createClient = (options:Options):RestClient => {
  const { domain, api_key } = options

  return new Shopify.Clients.Rest(`${domain}.myshopify.com`, api_key)
}
