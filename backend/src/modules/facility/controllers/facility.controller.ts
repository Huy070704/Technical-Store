import { Body, Controller, Get, Param, Patch, UseBefore } from "routing-controllers";
import { Service } from "typedi";
import { z } from "zod";
import { Admin } from "@/middlewares/auth.middleware";
import { parseBody } from "@/shared/validators/parse-body";
import { FacilityService } from "../services/facility.service";

const updateSchema = z.object({
  name: z.string().trim().min(1, "Tên cơ sở không được để trống").max(255).optional(),
  address: z.string().trim().max(255).nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  email: z.string().trim().email("Email không hợp lệ").max(255).nullable().optional(),
});

const activeSchema = z.object({ isActive: z.boolean() });

/**
 * Quản lý cơ sở (chỉ admin).
 * Response được bọc bởi ResponseInterceptor: { success, statusCode, data }.
 *
 * - GET   /api/facilities          → { facilities, summary }
 * - GET   /api/facilities/:id      → chi tiết cơ sở + danh sách nhân viên
 * - PATCH /api/facilities/:id        body: { name?, address?, phone?, email? } → cập nhật
 * - PATCH /api/facilities/:id/active body: { isActive }                        → khóa/mở khóa
 */
@Service()
@Controller("/facilities")
export class FacilityController {
  constructor(private readonly facilityService: FacilityService) {}

  @Get("/")
  @UseBefore(Admin)
  async list() {
    return this.facilityService.getFacilities();
  }

  @Get("/:id")
  @UseBefore(Admin)
  async detail(@Param("id") id: string) {
    return this.facilityService.getFacilityById(id);
  }

  @Patch("/:id")
  @UseBefore(Admin)
  async update(@Param("id") id: string, @Body({ validate: false }) body: unknown) {
    const dto = parseBody(updateSchema, body);
    return this.facilityService.updateFacility(id, dto);
  }

  @Patch("/:id/active")
  @UseBefore(Admin)
  async setActive(@Param("id") id: string, @Body({ validate: false }) body: unknown) {
    const dto = parseBody(activeSchema, body);
    return this.facilityService.setActive(id, dto.isActive);
  }
}
