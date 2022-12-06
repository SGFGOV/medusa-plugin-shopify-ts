import { IdMap } from "medusa-test-utils"
import fifty_products from "../../services/__fixtures__/test-data_products.fixture"


export const ProductModelMock = {
  create: jest.fn().mockReturnValue(Promise.resolve()),
  updateOne: jest.fn().mockImplementation((query, update) => {
    if (query._id === IdMap.getId("productWithVariantsFail")) {
      return Promise.reject()
    }
    return Promise.resolve()
  }),
  deleteOne: jest.fn().mockReturnValue(Promise.resolve()),
  findWithRelations: jest.fn().mockImplementation((data,ids)=>{
    const configuredProducts =fifty_products.map((data:any)=>{return{
      ...data,id:"prod_"+data.id,tags:data.tags.split(','),type:data.product_type}
    });
    return Promise.resolve(configuredProducts)
  }),
  findOne: jest.fn().mockImplementation(query => {
    if (query._id === IdMap.getId("fakeId")) {
      return Promise.resolve({
        _id: IdMap.getId("fakeId"),
        title: "Product With Variants",
        variants: ["1", "2", "3"],
      })
    }
    if (query._id === IdMap.getId("productWithFourVariants")) {
      return Promise.resolve({
        _id: IdMap.getId("productWithFourVariants"),
        title: "Product With Variants",
        variants: ["1", "2", "3", "4"],
        options: [
          {
            _id: IdMap.getId("color_id"),
            title: "Color",
          },
          {
            _id: IdMap.getId("size_id"),
            title: "Size",
          },
        ],
      })
    }

    if (query._id === IdMap.getId("productWithVariantsFail")) {
      return Promise.resolve({
        _id: IdMap.getId("productWithVariantsFail"),
        title: "Product With Variants",
        variants: ["1", "3", "4"],
        options: [
          {
            _id: IdMap.getId("color_id"),
            title: "Color",
          },
          {
            _id: IdMap.getId("size_id"),
            title: "Size",
          },
        ],
      })
    }
    if (query._id === IdMap.getId("productWithVariants")) {
      return Promise.resolve({
        _id: IdMap.getId("productWithVariants"),
        title: "Product With Variants",
        variants: ["1", "3", "4"],
        options: [
          {
            _id: IdMap.getId("color_id"),
            title: "Color",
          },
          {
            _id: IdMap.getId("size_id"),
            title: "Size",
          },
        ],
      })
    }

    if (query._id === IdMap.getId("variantProductId")) {
      return Promise.resolve({
        _id: IdMap.getId("variantProductId"),
        title: "testtitle",
        options: [
          {
            _id: IdMap.getId("color_id"),
            title: "Color",
          },
          {
            _id: IdMap.getId("size_id"),
            title: "Size",
          },
        ],
      })
    }

    if (query._id === IdMap.getId("emptyVariantProductId")) {
      return Promise.resolve({
        _id: IdMap.getId("emptyVariantProductId"),
        title: "testtitle",
        options: [],
      })
    }

    if (query._id === IdMap.getId("deleteId")) {
      return Promise.resolve({
        _id: IdMap.getId("deleteId"),
        variants: ["1", "2"],
      })
    }

    if (query._id === IdMap.getId("validId")) {
      return Promise.resolve({
        _id: IdMap.getId("validId"),
        title: "test",
      })
    }

    if (query._id === IdMap.getId("failId")) {
      return Promise.reject(new Error("test error"))
    }
    return Promise.resolve(undefined)
  }),
}
