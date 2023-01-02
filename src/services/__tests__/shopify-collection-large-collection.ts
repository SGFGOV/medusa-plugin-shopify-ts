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
import { ProductModelMock } from "../../repositories/__mocks__/product";
import { StoreRepository } from "@medusajs/medusa/dist/repositories/store";
import { StoreModelMock } from "../../repositories/__mocks__/store";
import fifty_products from "../__fixtures__/test-data_products.fixture";
import fifty_collections from "../__fixtures__/test-data-collection-2.fixture";
import six_custom_collections from "../__fixtures__/test-data-custom-collections.fixture";

const mockedLogger: jest.Mocked<Logger> = LoggerMock as any;

const mockedProductService: jest.Mocked<ProductService> =
  ProductServiceMock as any;

const mockedProductCollectionService: jest.Mocked<ProductCollectionService> =
  ProductCollectionServiceMock as any;
const mockedShopifyProductService: jest.Mocked<ShopifyProductService> =
  ShopifyProductServiceMock as any;
const mockedStoreService: jest.Mocked<StoreService> = StoreServiceMock as any;
const mockedProductRepository: jest.Mocked<typeof ProductRepository> =
  ProductModelMock as any;
const mockedStoreRepository: jest.Mocked<typeof StoreRepository> =
  StoreModelMock as any;

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
        storeRepository: mockedStoreRepository,
        logger: mockedLogger,
      },
      {}
    );

    beforeEach(async () => {
      jest.clearAllMocks();
    });

    it("creates a collection and adds products", async () => {
      const collects = fifty_collections;
      const collections = six_custom_collections;
      const products = [];
      products.push(...fifty_products);

      const results = await shopifyCollectionService.createCustomCollections(
        collects,
        collections,
        products
      );

      expect(
        ProductCollectionServiceMock.retrieveByHandle
      ).toHaveBeenCalledTimes(6);
      expect(ProductCollectionServiceMock.create).toHaveBeenCalledTimes(6);
      /* expect(results).toEqual(
        expect.arrayContaining({
          metadata: {
            sh_id: expect.any(String),
          },
        })
      );*/
    });

    it("normalizes a custom collection from Shopify", () => {
      const shopifyCollection = {
        id: "spring",
        body_html: "spring collection",
        title: "Spring",
        handle: "spring",
      };

      const normalized = shopifyCollectionService.normalizeCustomCollection_(
        shopifyCollection,
        "teststore"
      );

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

      const normalized = shopifyCollectionService.normalizeCustomCollection_(
        shopifyCollection,
        "teststore"
      );

      expect(normalized).toMatchSnapshot();
    });
  });
});
