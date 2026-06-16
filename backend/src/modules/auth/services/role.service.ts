import { Service } from "typedi";
import { Role } from "../role.entity";
import type { RoleDocument } from "../role.entity";

@Service()
export class RoleService {
  async createRoles(): Promise<void> {
    const admin = await Role.findOne({ name: "admin" });
    if (admin == null) {
      const role = new Role();
      role.name = "admin";
      role.slug = "admin";
      await role.save();
    }
    const manager = await Role.findOne({ name: "manager" });
    if (manager == null) {
      const role = new Role();
      role.name = "manager";
      role.slug = "manager";
      await role.save();
    }
    const staff = await Role.findOne({ name: "staff" });
    if (staff == null) {
      const role = new Role();
      role.name = "staff";
      role.slug = "staff";
      await role.save();
    }
    const customer = await Role.findOne({ name: "customer" });
    if (customer == null) {
      const role = new Role();
      role.name = "customer";
      role.slug = "customer";
      await role.save();
    }
    const shipper = await Role.findOne({ name: "shipper" });
    if (shipper == null) {
      const role = new Role();
      role.name = "shipper";
      role.slug = "shipper";
      await role.save();
    }
  }

  async getAllRoles(): Promise<RoleDocument[]> {
    return await Role.find({ name: { $ne: "admin" } });
  }
}
