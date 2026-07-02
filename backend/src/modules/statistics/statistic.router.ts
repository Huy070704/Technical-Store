import { StatisticController } from "./controllers/statistic.controller";

export const StatisticRouter = {
  name: "Sales & Dashboard Statistics API",
  basePath: "/statistics",
  routes: [
    {
      path: "/dashboard",
      method: "GET",
      action: StatisticController.prototype.getDashboardData,
      auth: "Admin/Manager",
      permission: { action: "read", subject: "Invoice" },
      description: "Lấy dữ liệu thống kê doanh số, số lượng đơn hàng và biểu đồ cho Dashboard",
    },
    {
      path: "/export",
      method: "GET",
      action: StatisticController.prototype.exportReport,
      auth: "Admin/Manager",
      permission: { action: "read", subject: "Invoice" },
      description: "Xuất file Excel báo cáo doanh số chi tiết (.xlsx)",
    },
    {
      path: "/revenue",
      method: "GET",
      action: StatisticController.prototype.getRevenueData,
      auth: "Admin/Manager",
      permission: { action: "read", subject: "Invoice" },
      description: "Lấy dữ liệu thống kê doanh thu: KPIs, xu hướng, top sản phẩm, phân bổ thanh toán, lịch sử giao dịch",
    },
    {
      path: "/manager-stats",
      method: "GET",
      action: StatisticController.prototype.getManagerStats,
      auth: "Admin/Manager",
      permission: { action: "read", subject: "Invoice" },
      description: "Lấy dữ liệu thống kê chi tiết cho Manager Dashboard (đơn hàng theo trạng thái, doanh thu theo chi nhánh/danh mục, khách hàng, sản phẩm bán chậm)",
    },
  ],
};

