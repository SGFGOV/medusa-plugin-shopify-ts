import { BatchJob, Product, User } from "@medusajs/medusa";
import { RestClient } from "@shopify/shopify-api/dist/clients/rest";
import { AwilixContainer } from "awilix";
import ShopifyService from "services/shopify";

export interface NewClientOptions {
  store_domain: string;
  api_key: string;
  default_store_name: string;
  enable_vendor_store?: boolean /** if enabled each vendor is added to its individual store */;
  auto_create_store?: boolean /** automatically creates vendor stores if the stores don't exist */;
  defaultClient?: RestClient;
  medusa_store_admin_email?: string;
  overwrite_on_import?: boolean;
  handleMetafields?: (
    container: AwilixContainer,
    product: Product,
    metafields: Record<string, any>
  ) => Promise<void>;
}

export type ClientOptions =
  | NewClientOptions
  | {
      defaultClient: RestClient;
      store_domain?: string;
      api_key?: string;
      default_store_name?: string;
      enable_vendor_store?: boolean;
      auto_create_store?: string;
      overwrite_on_import?: boolean;
      handleMetafields?: (
        container: AwilixContainer,
        product: Product,
        metafields: Record<string, any>
      ) => Promise<void>;
    };

export interface ShopifyFetchRequest {
  enable_vendor_store?: boolean;
  auto_create_store?: string;
  overwrite_on_import?: boolean;
  requestId: string;
  api_key: string;
  store_domain: string;
  default_store_name: string;
}
export interface ShopifyImportRequest extends ShopifyFetchRequest {
  requestId: string;
  medusa_store_admin_email?: string;
  max_num_products?: number;
  shopify_product_ids?: string[];
}

export type ShopifyRequest = ShopifyFetchRequest &
  ShopifyImportRequest &
  ClientOptions;

/**
 * data fetched from shopify
 */
export interface FetchedShopifyData {
  products: any[];
  customCollections: any[];
  smartCollections: any[];
  collects: any[];
}

export type ShopifyData = Record<string, unknown>;
export type ShopifyProduct = ShopifyData & {
  vendor: string;
  id: string;
  metadata?: {
    vendor?: string;
  };
};

export type ShopifyCollection = ShopifyData & {
  id: number;
};
export type ShopifyProducts = ShopifyProduct[];
export type ShopifyCollections = ShopifyCollection[];
export type ShopifyImportCallBack = (
  self: ShopifyService,
  pageData: ShopifyData[],
  shopifyImportRequest: ShopifyImportRequest,
  userId: string,
  path: string
) => Promise<BatchJob>;

export type ShopifyPath =
  | "products"
  | "smart_collections"
  | "custom_collections"
  | "collects"
  | "metafields";
export type ShopifyJobResult = {
  advancement_count: number;
  shopifyData: ShopifyData[] | ShopifyData[][] | Product[];
  path: ShopifyPath;
};
