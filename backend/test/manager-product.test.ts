import "reflect-metadata";
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { Types } from "mongoose";
import { Product } from "../src/modules/product/models/product.model";
import { Inventory } from "../src/modules/inventory/models/inventory.model";
import { Account } from "../src/modules/auth/models/account.model";
import { ProductService } from "../src/modules/product/services/product.service";
import { ProductController } from "../src/modules/product/controllers/product.controller";
import { BadRequestException } from "../src/shared/exceptions/http-exceptions";

const queryResult = <T>(value: T) => {
  const query: any = {
    populate() {
      return query;
    },
    sort() {
      return query;
    },
    setOptions() {
      return query;
    },
    then(resolve: (result: T) => unknown, reject: (error: unknown) => unknown) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
  return query;
};

describe("Manager Product Tests", () => {
  const originalProductFind = Product.find;
  const originalInventoryFind = Inventory.find;
  const originalAccountFindById = Account.findById;

  afterEach(() => {
    Product.find = originalProductFind;
    Inventory.find = originalInventoryFind;
    Account.findById = originalAccountFindById;
  });

  describe("ProductService - getAllProductsByFacility", () => {
    it("should retrieve all products with stock for a specific facility", async () => {
      const facilityId = new Types.ObjectId().toString();
      const productId1 = new Types.ObjectId();
      const productId2 = new Types.ObjectId();

      const mockProducts = [
        {
          _id: productId1,
          name: "Laptop Asus",
          price: 15000000,
          toJSON() {
            return { _id: this._id, name: this.name, price: this.price };
          },
        },
        {
          _id: productId2,
          name: "Mouse Logitech",
          price: 500000,
          toJSON() {
            return { _id: this._id, name: this.name, price: this.price };
          },
        },
      ];

      const mockInventories = [
        {
          product: productId1,
          facility: new Types.ObjectId(facilityId),
          quantity: 10,
        },
      ];

      // Mock Product.find
      Product.find = ((filter: any) => {
        // withDeleted: true is set, so filter can be undefined
        return queryResult(mockProducts);
      }) as unknown as typeof Product.find;

      // Mock Inventory.find
      Inventory.find = ((filter: any) => {
        assert.equal(filter.facility.toString(), facilityId);
        assert.deepEqual(filter.deletedAt, null);
        assert.deepEqual(filter.product.$in, [productId1, productId2]);

        const query: any = {
          setOptions() {
            return query;
          },
          lean() {
            return Promise.resolve(mockInventories);
          },
        };
        return query;
      }) as unknown as typeof Inventory.find;

      const service = new ProductService();
      const result = await service.getAllProductsByFacility(facilityId);

      assert.equal(result.length, 2);
      
      // First product has stock 10
      assert.equal(result[0]._id.toString(), productId1.toString());
      assert.equal(result[0].stock, 10);

      // Second product has stock 0 (not in inventory)
      assert.equal(result[1]._id.toString(), productId2.toString());
      assert.equal(result[1].stock, 0);
    });
  });

  describe("ProductController - getManagerProducts", () => {
    it("should return manager products when facility is assigned", async () => {
      const accountId = new Types.ObjectId().toString();
      const facilityId = new Types.ObjectId();
      const mockManager = {
        _id: accountId,
        facility: facilityId,
      };

      const mockProducts = [
        { _id: "p1", name: "Product 1", stock: 5 },
      ];

      // Mock Account.findById
      Account.findById = ((id: any) => {
        assert.equal(id, accountId);
        return queryResult(mockManager);
      }) as unknown as typeof Account.findById;

      // Mock ProductService
      const mockProductService = {
        async getAllProductsByFacility(fId: string) {
          assert.equal(fId, facilityId.toString());
          return mockProducts;
        },
      };

      const controller = new ProductController(mockProductService as any);
      const req = {
        user: {
          accountId,
        },
      };

      const response = await controller.getManagerProducts(req);

      assert.equal(response.message, "Products retrieved successfully");
      assert.deepEqual(response.products, mockProducts);
    });

    it("should throw BadRequestException if manager is not assigned to a facility", async () => {
      const accountId = new Types.ObjectId().toString();
      const mockManager = {
        _id: accountId,
        facility: null, // No facility
      };

      // Mock Account.findById
      Account.findById = ((id: any) => {
        assert.equal(id, accountId);
        return queryResult(mockManager);
      }) as unknown as typeof Account.findById;

      const mockProductService = {};
      const controller = new ProductController(mockProductService as any);
      const req = {
        user: {
          accountId,
        },
      };

      await assert.rejects(
        () => controller.getManagerProducts(req),
        (error: any) => {
          assert.ok(error instanceof BadRequestException);
          assert.equal(error.message, "Tài khoản quản lý chưa được phân công cơ sở");
          return true;
        }
      );
    });
  });
});
