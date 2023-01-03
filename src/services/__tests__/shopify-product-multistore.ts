import {
  EventBusService,
  Product,
  ProductVariantService,
  ShippingProfileService,
} from "@medusajs/medusa";
import { Logger } from "@medusajs/medusa/dist/types/global";
import { MockManager } from "medusa-test-utils";
import ShopifyClientService from "services/shopify-client";
import ShopifyRedisService from "services/shopify-redis";

import ShopifyProductService from "../shopify-product";
import { ProductVariantServiceMock } from "../__mocks__/product-variant";
import { ShippingProfileServiceMock } from "../__mocks__/shipping-profile";
import { ShopifyClientServiceMock } from "../__mocks__/shopify-client";
import { ShopifyRedisServiceMock } from "../__mocks__/shopify-redis";
import { medusaProducts, shopifyProducts } from "../__mocks__/test-products";
import LoggerMock from "../__mocks__/logger";
import { ProductServiceMultiStoreMock } from "../__mocks__/product-service-multistore";
import { MultiStoreProductService } from "services/modified-core-services/multistore-product";
import { EventBusServiceMock } from "../__mocks__";

const mockedLogger: jest.Mocked<Logger> = LoggerMock as any;

const mockedShopifyClientService: jest.Mocked<ShopifyClientService> =
  ShopifyClientServiceMock as any;
const mockedProductService: jest.Mocked<MultiStoreProductService> =
  ProductServiceMultiStoreMock as any;
const mockedProductVariantService: jest.Mocked<ProductVariantService> =
  ProductVariantServiceMock as any;
const mockedShippingProfileService: jest.Mocked<ShippingProfileService> =
  ShippingProfileServiceMock as any;
const mockedShopifyRedisService: jest.Mocked<ShopifyRedisService> =
  ShopifyRedisServiceMock as any;
const mockedEventBusService: jest.Mocked<EventBusService> =
  EventBusServiceMock as any;

describe("ShopifyProductService", () => {
  describe("normalizeProduct_", () => {
    const shopifyProductService = new ShopifyProductService(
      {
        manager: MockManager,
        shopifyClientService: mockedShopifyClientService,
        productService: mockedProductService,
        productVariantService: mockedProductVariantService,
        shippingProfileService: mockedShippingProfileService,
        shopifyRedisService: mockedShopifyRedisService,
        logger: mockedLogger,
        eventBusService: mockedEventBusService,
      },
      {}
    );

    beforeEach(async () => {
      jest.clearAllMocks();
    });

    it("succesfully normalizes a product from Shopify", async () => {
      const data = await ShopifyClientServiceMock.get({
        path: "products/ipod",
      });

      const normalized = shopifyProductService.normalizeProduct_(
        data,
        "mockstore"
      );
      expect(normalized).toMatchSnapshot();
    });
  });

  describe("create", () => {
    const shopifyProductService = new ShopifyProductService(
      {
        manager: MockManager,
        shopifyClientService: mockedShopifyClientService,
        productService: mockedProductService,
        productVariantService: mockedProductVariantService,
        shippingProfileService: mockedShippingProfileService,
        shopifyRedisService: mockedShopifyRedisService,
        logger: mockedLogger,
        eventBusService: mockedEventBusService,
      },
      {}
    );

    beforeEach(async () => {
      jest.clearAllMocks();
    });

    it("succesfully creates a product from Shopify", async () => {
      const data = shopifyProducts.new_ipod;

      const product = await shopifyProductService.create(data, "mockstore");

      expect(ShopifyRedisServiceMock.shouldIgnore).toHaveBeenCalledTimes(1);
      expect(ShopifyRedisServiceMock.addIgnore).toHaveBeenCalledTimes(1);
      expect(ShippingProfileServiceMock.retrieveDefault).toHaveBeenCalledTimes(
        1
      );
      expect(ProductServiceMultiStoreMock.create).toHaveBeenCalledTimes(1);
      expect(ProductVariantServiceMock.create).toHaveBeenCalledTimes(4);
      expect(product).toMatchObject({
        ...{
          id: "prod_ipod",
          store_id: "mockstore",
        },
      });
    });
  });

  describe("update", () => {
    const shopifyProductService = new ShopifyProductService(
      {
        manager: MockManager,
        shopifyClientService: mockedShopifyClientService,
        productService: mockedProductService,
        productVariantService: mockedProductVariantService,
        shippingProfileService: mockedShippingProfileService,
        shopifyRedisService: mockedShopifyRedisService,
        logger: mockedLogger,
        eventBusService: mockedEventBusService,
      },

      {}
    );

    beforeEach(async () => {
      jest.clearAllMocks();
    });

    it("updates a product and adds 4 new variants", async () => {
      const data = shopifyProducts.ipod_update;
      jest
        .spyOn(shopifyProductService, "addProductOptions_")
        .mockImplementation(() =>
          Promise.resolve({
            ...medusaProducts.ipod,
            options: [
              ...medusaProducts.ipod.options,
              {
                id: "opt_01FHZ9ZFCPCQ7B1MPDD9X9YQX4",
                title: "Memory",
                product_id: "prod_01FHZ9ZFC3KKYKA35NXNJ5A7FR",
                created_at: "2021-10-14T11:46:10.391Z",
                updated_at: "2021-10-14T11:46:10.391Z",
                deleted_at: null,
                metadata: null,
              },
            ],
          } as unknown as Product)
        );

      await shopifyProductService.update(medusaProducts.ipod, data);

      expect(ProductVariantServiceMock.update).toHaveBeenCalledTimes(8);
      expect(ProductServiceMultiStoreMock.update).toHaveBeenCalledTimes(1);
    });

    it("updates a product and deletes 2 existing variants", async () => {
      const data = { ...shopifyProducts.ipod, id: "shopify_deleted" };
      data.variants = data.variants.slice(1, -1);
      await shopifyProductService.update(
        { ...medusaProducts.ipod, id: "shopify_deleted" },
        data
      );

      expect(ProductVariantServiceMock.delete).toHaveBeenCalledTimes(2);
      expect(ProductServiceMultiStoreMock.update).toHaveBeenCalledTimes(1);
    });
  });
});
