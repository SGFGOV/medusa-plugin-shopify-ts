export const INCLUDE_PRESENTMENT_PRICES = {
  "X-Shopify-Api-Features": "include-presentment-prices",
};

export const IGNORE_THRESHOLD = 2;
export const DURATION_BETWEEN_CALLS = process.env.SHOPIFY_QUERY_DELAY
  ? parseInt(process.env.SHOPIFY_QUERY_DELAY)
  : 1000; /** in milliseconds */
