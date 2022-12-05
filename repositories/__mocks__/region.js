"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegionModelMock = exports.regions = void 0;
const medusa_test_utils_1 = require("medusa-test-utils");
exports.regions = {
    testRegion: {
        _id: medusa_test_utils_1.IdMap.getId("testRegion"),
        name: "Test Region",
        countries: ["DK", "US", "DE"],
        tax_rate: 0.25,
        payment_providers: ["default_provider", "unregistered"],
        fulfillment_providers: ["test_shipper"],
        currency_code: "usd",
    },
    regionFrance: {
        _id: medusa_test_utils_1.IdMap.getId("region-france"),
        name: "France",
        countries: ["FR"],
        payment_providers: ["default_provider", "france-provider"],
        currency_code: "eur",
    },
    regionUs: {
        _id: medusa_test_utils_1.IdMap.getId("region-us"),
        name: "USA",
        countries: ["US"],
        currency_code: "usd",
    },
    regionGermany: {
        _id: medusa_test_utils_1.IdMap.getId("region-de"),
        name: "Germany",
        countries: ["DE"],
        currency_code: "eur",
    },
    regionSweden: {
        _id: medusa_test_utils_1.IdMap.getId("region-se"),
        name: "Sweden",
        countries: ["SE"],
        payment_providers: ["sweden_provider"],
        fulfillment_providers: ["sweden_provider"],
        currency_code: "SEK",
    },
};
exports.RegionModelMock = {
    create: jest.fn().mockReturnValue(Promise.resolve()),
    updateOne: jest.fn().mockImplementation((query, update) => { }),
    deleteOne: jest.fn().mockReturnValue(Promise.resolve()),
    findOne: jest.fn().mockImplementation(query => {
        if (query.countries === "SE") {
            return Promise.resolve(exports.regions.regionSweden);
        }
        switch (query._id) {
            case medusa_test_utils_1.IdMap.getId("testRegion"):
                return Promise.resolve(exports.regions.testRegion);
            case medusa_test_utils_1.IdMap.getId("region-france"):
                return Promise.resolve(exports.regions.regionFrance);
            case medusa_test_utils_1.IdMap.getId("region-us"):
                return Promise.resolve(exports.regions.regionUs);
            case medusa_test_utils_1.IdMap.getId("region-de"):
                return Promise.resolve(exports.regions.regionGermany);
            case medusa_test_utils_1.IdMap.getId("region-se"):
                return Promise.resolve(exports.regions.regionSweden);
            default:
                return Promise.resolve(undefined);
        }
    }),
};
//# sourceMappingURL=region.js.map