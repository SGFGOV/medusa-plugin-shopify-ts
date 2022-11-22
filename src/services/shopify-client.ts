import { DataType } from "@shopify/shopify-api";
import { RestClient } from "@shopify/shopify-api/dist/clients/rest";
import { ClientOptions } from "interfaces/interfaces";
import { BaseService } from "medusa-interfaces";
import { createClient } from "../utils/create-client";
import { pager } from "../utils/pager";

class ShopifyClientService extends BaseService {
  options: ClientOptions;
  defaultClient_: RestClient;
  // eslint-disable-next-line no-empty-pattern
  constructor({}: any, options: ClientOptions) {
    super();

    this.options = options;

    /** @private @const {ShopifyRestClient} */
    this.defaultClient_ = createClient(this.options);
  }

  static createClient(options: ClientOptions): RestClient {
    return createClient(options);
  }

  get(params: any, client = this.defaultClient_): any {
    return client.get(params);
  }

  async list(
    path: string,
    extraHeaders = null,
    extraQuery = {},
    client = this.defaultClient_
  ): Promise<any> {
    return await pager(client, path, extraHeaders, extraQuery);
  }

  delete(params: any, client = this.defaultClient_): any {
    return client.delete(params);
  }

  post(
    params: { path: any; body: any; type?: DataType },
    client = this.defaultClient_
  ): any {
    return client.post({
      path: params.path,
      data: params.body,
      type: DataType.JSON,
    });
  }

  put(params: any, client = this.defaultClient_): any {
    return client.post(params);
  }
}

export default ShopifyClientService;
