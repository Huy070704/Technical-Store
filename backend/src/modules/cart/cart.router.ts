import { CartController } from "./controllers/cart.controller";

export const CartRouter = {
  name: "Cart Management API",
  basePath: "/cart",
  routes: [
    {
      path: "/view",
      method: "GET",
      action: CartController.prototype.viewCart,
      auth: true,
      description: "Xem chi tiết giỏ hàng hiện tại",
    },
    {
      path: "/add",
      method: "POST",
      action: CartController.prototype.addToCart,
      auth: true,
      description: "Thêm sản phẩm vào giỏ hàng",
    },
    {
      path: "/increase",
      method: "POST",
      action: CartController.prototype.increase,
      auth: true,
      description: "Tăng số lượng sản phẩm trong giỏ hàng",
    },
    {
      path: "/decrease",
      method: "POST",
      action: CartController.prototype.decrease,
      auth: true,
      description: "Giảm số lượng sản phẩm trong giỏ hàng",
    },
    {
      path: "/remove",
      method: "PATCH",
      action: CartController.prototype.remove,
      auth: true,
      description: "Xóa sản phẩm khỏi giỏ hàng",
    },
    {
      path: "/clear",
      method: "POST",
      action: CartController.prototype.clear,
      auth: true,
      description: "Xóa toàn bộ sản phẩm trong giỏ hàng",
    },
    {
      path: "/merge-guest",
      method: "POST",
      action: CartController.prototype.mergeGuest,
      auth: true,
      description: "Đồng bộ giỏ hàng từ khách vãng lai khi đăng nhập thành công",
    },
  ],
};
