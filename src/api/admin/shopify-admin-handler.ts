import { Request, Response, Router } from "express";
import * as bodyParser from "body-parser";
import ShopifyService from "../../services/shopify";

import authenticate from "@medusajs/medusa/dist/api/middlewares/authenticate";

export default (): Router => {
  const app = Router();
  app.use(bodyParser.json());

  app.get(
    "/save-shopify-products",
    authenticate(),
    async (req: Request, res: Response): Promise<Response<void>> => {
      const shopifyService = req.scope.resolve(
        "ShopifyService"
      ) as ShopifyService;
      const result = await shopifyService.importIntoStore({
        default_store_name: req.body.default_store_name,
        api_key: req.body.api_key,
        store_domain: req.body.store_domain,
        max_num_products: req.body.max_num_products,
        shopify_product_ids: req.body.shopify_product_ids,
        medusa_store_admin_email: req.body.store_admin_email,
      });

      return res.status(200).json(result);
    }
  );

  app.get(
    "/fetch-shopify-products",
    authenticate(),
    async (req: Request, res: Response): Promise<Response<void>> => {
      const shopifyService = req.scope.resolve(
        "ShopifyService"
      ) as ShopifyService;
      const result = await shopifyService.fetchFromShopifyAndProcess({
        api_key: req.body.api_key,
        store_domain: req.body.store_domain,
        default_store_name: req.body.default_store_name,
      });

      return res.status(200).json(result);
    }
  );

  return app;
};
