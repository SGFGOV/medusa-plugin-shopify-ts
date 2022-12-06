import fifty_products from "./test-data_products.fixture";
import fifty_collections from "./test-data-collections.fixture";
import fifity_smart_collections from "./test-data-smart-collections";

let i = 0;
for (const collection of fifty_collections) {
  collection.product_id = fifty_products[i++].id;
}

i = 0;
for (const collection of fifty_collections) {
  collection.collection_id = fifity_smart_collections[i++].id;
}

console.log(fifty_collections);
