import { AbstractBatchJobStrategy } from "@medusajs/medusa";
import { MedusaError } from "medusa-core-utils";
import { default as shopifyStrategy } from "../../strategies/shopify-import";
export const strategyResolverServiceMock = {
  withTransaction: function (): any {
    return this;
  },

  resolveBatchJobByType(type: string): AbstractBatchJobStrategy {
    let resolved: AbstractBatchJobStrategy;
    try {
      /** currently set to the default strategy */
      resolved = undefined;
      // this.container[`batchType_${type}`] as AbstractBatchJobStrategy
    } catch (e) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Unable to find a BatchJob strategy with the type ${type}`
      );
    }
    return resolved;
  },
};

const mock = jest.fn().mockImplementation(() => {
  return strategyResolverServiceMock;
});

export default mock;
