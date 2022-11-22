import { AwilixContainer } from 'awilix';

export default (container: AwilixContainer, config: Record<string, unknown>): void | Promise<void> => {
  /* Implement your own loader. */
  try {
    const shopifyService = container.resolve("shopifyService")
    //  await shopifyService.importShopify()
  } catch (err) {
    console.log(err)
  }
}
