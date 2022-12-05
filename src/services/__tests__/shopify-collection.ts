import { MockManager } from "medusa-test-utils";
import ShopifyCollectionService from "../shopify-collection";
import { ProductCollectionServiceMock } from "../__mocks__/product-collection";
import { ShopifyProductServiceMock } from "../__mocks__/shopify-product";
import { medusaProducts } from "../__mocks__/test-products";
import { Logger } from "@medusajs/medusa/dist/types/global";
import { ProductServiceMock } from "../__mocks__/product-service";
import {
  ProductCollectionService,
  ProductService,
  StoreService,
} from "@medusajs/medusa";
import { ProductRepository } from "@medusajs/medusa/dist/repositories/product";
import ShopifyProductService from "../shopify-product";
import LoggerMock from "../__mocks__/logger";
import { StoreServiceMock } from "../__mocks__/store-service";

const mockedLogger: jest.Mocked<Logger> = LoggerMock as any;

const mockedProductService: jest.Mocked<ProductService> =
  ProductServiceMock as any;

const mockedProductCollectionService: jest.Mocked<ProductCollectionService> =
  ProductCollectionServiceMock as any;
const mockedShopifyProductService: jest.Mocked<ShopifyProductService> =
  ShopifyProductServiceMock as any;
const mockedStoreService: jest.Mocked<StoreService> = StoreServiceMock as any;
let mockedProductRepository: jest.Mocked<ProductRepository>;

describe("ShopifyCollectionService", () => {
  describe("create", () => {
    const shopifyCollectionService = new ShopifyCollectionService(
      {
        manager: MockManager,
        shopifyProductService: mockedShopifyProductService,
        productCollectionService: mockedProductCollectionService,
        productService: mockedProductService,
        storeService: mockedStoreService,
        productRepository: mockedProductRepository,
        logger: mockedLogger,
      },
      {}
    );

    beforeEach(async () => {
      jest.clearAllMocks();
    });

    it("creates a collection and adds products", async () => {
      const collects = [
        {
          collection_id: "spring",
          created_at: "2018-04-25T13:51:12-04:00",
          id: 841564295,
          position: 2,
          product_id: "shopify_ipod",
          sort_value: "0000000002",
          updated_at: "2018-04-25T13:51:12-04:00",
        },
      ];
      const collections = [
        {
          id: "spring",
          body_html: "spring collection",
          title: "Spring",
          handle: "spring",
        },
      ];
      const products = [medusaProducts.ipod];

      const results = await shopifyCollectionService.createCustomCollections(
        collects,
        collections,
        products
      );

      expect(
        ProductCollectionServiceMock.retrieveByHandle
      ).toHaveBeenCalledTimes(1);
      expect(ProductCollectionServiceMock.create).toHaveBeenCalledTimes(1);
      expect(results).toEqual([
        {
          id: "col_spring",
          title: "Spring",
          handle: "spring",
          metadata: {
            sh_id: "spring",
            sh_body: "spring collection",
          },
        },
      ]);
    });

    it("normalizes a custom collection from Shopify", () => {
      const shopifyCollection = {
        id: "spring",
        body_html: "spring collection",
        title: "Spring",
        handle: "spring",
      };

      const normalized =
        shopifyCollectionService.normalizeCustomCollection_(shopifyCollection);

      expect(normalized).toMatchSnapshot();
    });

    it("normalizes a smart collection from Shopify", () => {
      const shopifyCollection = {
        id: 1063001322,
        handle: "ipods-1",
        title: "IPods",
        updated_at: "2022-03-11T11:00:30-05:00",
        body_html: null,
        published_at: "2022-03-11T11:00:30-05:00",
        sort_order: "best-selling",
        template_suffix: null,
        disjunctive: false,
        rules: [
          {
            column: "title",
            relation: "starts_with",
            condition: "iPod",
          },
        ],
        published_scope: "web",
        admin_graphql_api_id: "gid://shopify/Collection/1063001322",
      };

      const normalized =
        shopifyCollectionService.normalizeCustomCollection_(shopifyCollection);

      expect(normalized).toMatchSnapshot();
    });
  });
});
