import { Logger } from "@medusajs/medusa/dist/types/global";
import { sleep } from "@medusajs/medusa/dist/utils/sleep";
import {
  ShopifyImportCallBack,
  ShopifyImportRequest,
} from "interfaces/shopify-interfaces";
import { RestClient } from "@shopify/shopify-api/dist/clients/rest";
import ShopifyService from "services/shopify";

export async function pager<ShopifyData>(
  shopifyService: ShopifyService,
  client: RestClient,
  path: string,
  shopifyImportRequest: ShopifyImportRequest,
  userId: string,
  extraHeaders = null,
  extraQuery = {},
  logger?: Logger,
  gotPageCallBack?: ShopifyImportCallBack
): Promise<ShopifyData[]> {
  let objects = [];
  let nextPage = null;
  let hasNext = true;
  let pageCount = 0;

  while (hasNext) {
    const params = {
      path,
      query: { page_info: nextPage },
    };
    logger?.info(`fetching page ${path} ${pageCount++}`);
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
    await sleep(600);

    const currentPageResponse = response.body[path];

    objects = [...objects, ...currentPageResponse];

    const link = response.headers.get("link");
    const match =
      /(?:page_info=)(?<page_info>[a-zA-Z0-9]+)(?:>; rel="next")/.exec(link);

    if (match?.groups) {
      nextPage = match.groups["page_info"];
      hasNext = true;
    } else {
      hasNext = false;
    }
    if (gotPageCallBack && currentPageResponse?.length > 0) {
      await gotPageCallBack(
        shopifyService,
        currentPageResponse,
        shopifyImportRequest,
        userId,
        path
      );
    }
    if (
      shopifyImportRequest.max_num_products &&
      objects?.length >= shopifyImportRequest.max_num_products
    ) {
      logger?.info(`completed fetching ${pageCount}`);
      return objects.slice(0, shopifyImportRequest.max_num_products);
    }
  }
  logger?.info(`completed fetching ${pageCount}`);

  return objects;
}
