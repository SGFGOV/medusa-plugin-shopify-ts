import { Request, Response, Router } from "express";
import * as bodyParser from "body-parser";
import ShopifyService from "../../services/shopify";

import authenticate from "@medusajs/medusa/dist/api/middlewares/authenticate";
import { IdempotencyKeyService } from "@medusajs/medusa";
import { FetchedShopifyData } from "interfaces/shopify-interfaces";
/** yet to to be tested
 *
 */
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
      const idempotencyKeyService = req.scope.resolve(
        "idempotencyKeyService"
      ) as IdempotencyKeyService;

      const idemKey = await idempotencyKeyService.create({
        request_method: req.method,
        request_params: req.params,
        request_path: req.path,
      });
      const result = idempotencyKeyService.workStage(
        idemKey.idempotency_key,
        async (
          manager
        ): Promise<{
          response_code: number;
          response_body: { result: unknown };
        }> => {
          const result = await shopifyService
            .withTransaction(manager)
            .importIntoStore({
              default_store_name: req.body.default_store_name,
              api_key: req.body.api_key,
              store_domain: req.body.store_domain,
              max_num_products: req.body.max_num_products,
              shopify_product_ids: req.body.shopify_product_ids,
              medusa_store_admin_email: req.body.store_admin_email,
              requestId: idemKey.idempotency_key,
            });
          return {
            response_code: 200,
            response_body: { result: result },
          };
        }
      );

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

      const idempotencyKeyService = req.scope.resolve(
        "idempotencyKeyService"
      ) as IdempotencyKeyService;
      const idemKey = await idempotencyKeyService.create({
        request_method: req.method,
        request_params: req.params,
        request_path: req.path,
      });

      const result = idempotencyKeyService.workStage(
        idemKey.idempotency_key,
        async (manager) => {
          return await shopifyService
            .withTransaction(manager)
            .fetchFromShopifyAndProcess({
              requestId: idemKey.idempotency_key,
              api_key: req.body.api_key,
              store_domain: req.body.store_domain,
              default_store_name: req.body.default_store_name,
            });
        }
      );

      return res.status(200).json(result);
    }
  );

  return app;
};
