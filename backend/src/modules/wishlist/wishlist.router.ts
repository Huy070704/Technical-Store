import { WishlistController } from "./controllers/wishlist.controller";

export const WishlistRouter = {
  name: "Wishlist Management API",
  basePath: "/wishlist",
  routes: [
    {
      path: "/view",
      method: "GET",
      action: WishlistController.prototype.view,
      auth: true,
      description: "Xem danh sách sản phẩm yêu thích hiện tại",
    },
    {
      path: "/toggle",
      method: "POST",
      action: WishlistController.prototype.toggle,
      auth: true,
      description: "Thêm hoặc bỏ một sản phẩm khỏi danh sách yêu thích",
    },
    {
      path: "/clear",
      method: "POST",
      action: WishlistController.prototype.clear,
      auth: true,
      description: "Xóa toàn bộ danh sách yêu thích",
    },
    {
      path: "/merge-guest",
      method: "POST",
      action: WishlistController.prototype.mergeGuest,
      auth: true,
      description: "Đồng bộ danh sách yêu thích từ khách vãng lai khi đăng nhập",
    },
  ],
};
