import "reflect-metadata";
import "dotenv/config";
import { DbConnection } from "./dbConnection";

// Ensure all models are registered in Mongoose first
import "../modules/auth/models/role.model";
import "../modules/auth/models/account.model";
import "../modules/auth/models/refreshToken.model";
import "../modules/otp/models/otp.model";
import "../modules/facility/models/facility.model";
import "../modules/product/models/category.model";
import "../modules/product/models/product.model";
import "../modules/cart/models/cart.model";
import "../modules/cart/models/cartItem.model";
import "../modules/order/models/order.model";
import "../modules/order/models/orderDetail.model";
import "../modules/payment/models/payment.model";
import "../modules/payment/models/invoice.model";
import "../modules/feedback/models/feedback.model";
import "../modules/wishlist/models/wishlist.model";
import "../modules/inventory/models/inventory.model";
import "../modules/inventory/models/inventoryDetail.model";
import "../modules/staff-request/models/staffRequest.model";
import "../modules/image/models/image.model";

// Models
import { Role } from "../modules/auth/models/role.model";
import { Account } from "../modules/auth/models/account.model";
import { Facility } from "../modules/facility/models/facility.model";
import { Product } from "../modules/product/models/product.model";
import { Category } from "../modules/product/models/category.model";
import { Inventory } from "../modules/inventory/models/inventory.model";
import { Order, OrderStatus } from "../modules/order/models/order.model";
import { OrderDetail } from "../modules/order/models/orderDetail.model";
import { Payment, PaymentStatus } from "../modules/payment/models/payment.model";
import { Invoice, InvoiceStatus } from "../modules/payment/models/invoice.model";
import { Feedback } from "../modules/feedback/models/feedback.model";
import { StaffRequest } from "../modules/staff-request/models/staffRequest.model";

async function seedTransactions() {
  console.log("🌱 Khởi chạy seed dữ liệu giao dịch mẫu...");
  const connection = await DbConnection.createConnection();
  if (connection?.readyState !== 1) {
    throw new Error("Không thể kết nối MongoDB");
  }

  // 1. Dọn dẹp dữ liệu cũ trong các bảng giao dịch
  console.log("🗑️  Đang dọn dẹp các bảng giao dịch cũ...");
  await Promise.all([
    Order.deleteMany({}),
    OrderDetail.deleteMany({}),
    Payment.deleteMany({}),
    Invoice.deleteMany({}),
    Feedback.deleteMany({}),
    StaffRequest.deleteMany({}),
    Inventory.deleteMany({}),
  ]);
  console.log("✅ Dọn dẹp hoàn tất.");

  // 2. Lấy dữ liệu nền đã seed trước đó
  const [accounts, facilities, products] = await Promise.all([
    Account.find().populate("role"),
    Facility.find({ isActive: true }),
    Product.find({ isActive: true }),
  ]);

  if (!accounts.length || !facilities.length || !products.length) {
    throw new Error("Thiếu dữ liệu nền (Accounts, Facilities, Products). Vui lòng chạy seed chính trước!");
  }

  const customers = accounts.filter((a) => (a.role as any).slug === "customer");
  const managers = accounts.filter((a) => (a.role as any).slug === "manager");
  const staff = accounts.filter((a) => (a.role as any).slug === "staff");
  const admins = accounts.filter((a) => (a.role as any).slug === "admin");

  // 3. Khởi tạo Tồn kho (Inventory) cho toàn bộ sản phẩm tại các chi nhánh
  console.log("📦 Đang khởi tạo dữ liệu tồn kho...");
  for (const facility of facilities) {
    for (const product of products) {
      const quantity = Math.floor(Math.random() * 80) + 20; // 20 - 100 sản phẩm
      await Inventory.create({
        facility: facility._id,
        product: product._id,
        quantity,
        minimumStockLevel: 10,
      });
    }
  }
  console.log(`✅ Đã tạo tồn kho cho ${facilities.length} chi nhánh x ${products.length} sản phẩm.`);

  // 4. Khởi tạo Yêu cầu Nhân sự (StaffRequest) mẫu từ Manager gửi lên Admin
  console.log("📋 Đang tạo yêu cầu nhân sự mẫu...");
  const rolesNeeded = ["staff", "shipper"] as const;
  const requestStatuses = ["pending", "approved", "rejected"] as const;
  
  for (let i = 0; i < 6; i++) {
    const manager = managers[i % managers.length];
    const facility = facilities.find((f) => f._id.toString() === manager.facility?.toString()) || facilities[0];
    const roleNeeded = rolesNeeded[i % rolesNeeded.length];
    const status = requestStatuses[i % requestStatuses.length];
    const quantity = Math.floor(Math.random() * 3) + 1;
    
    const request = new StaffRequest({
      facility: facility._id,
      requestedBy: manager._id,
      roleNeeded,
      quantity,
      reason: `Cơ sở đang thiếu nhân sự vị trí ${roleNeeded} phục vụ mùa cao điểm.`,
      status,
    });

    if (status !== "pending") {
      request.reviewedBy = admins[0]._id;
      request.reviewedAt = new Date(Date.now() - (7 - i) * 24 * 60 * 60 * 1000);
      request.adminNote = status === "approved" 
        ? "Đồng ý phê duyệt, phòng nhân sự liên hệ phỏng vấn tuyển dụng." 
        : "Hiện tại chi phí vận hành chi nhánh đang tối đa, đề xuất manager tự tối ưu nhân sự có sẵn.";
    }

    await request.save();
  }
  console.log("✅ Đã tạo 6 yêu cầu nhân sự mẫu.");

  // 5. Khởi tạo Đơn hàng (Orders), Chi tiết (OrderDetails), Hóa đơn (Invoices), Thanh toán (Payments)
  console.log("🛒 Đang tạo các đơn hàng mẫu...");
  const orderStatuses = [
    OrderStatus.PENDING,
    OrderStatus.PROCESSING,
    OrderStatus.SHIPPING,
    OrderStatus.DELIVERED,
    OrderStatus.SUCCESSFUL,
    OrderStatus.CANCELLED,
  ];

  const paymentMethods = ["COD", "ONLINE"] as const;
  const createdOrders: any[] = [];

  for (let i = 0; i < 15; i++) {
    const customer = customers[i % customers.length];
    const facility = facilities[i % facilities.length];
    const status = orderStatuses[i % orderStatuses.length];
    const paymentMethod = paymentMethods[i % paymentMethods.length];
    
    // Chọn ngẫu nhiên 1 - 3 sản phẩm để mua
    const numItems = Math.floor(Math.random() * 3) + 1;
    const selectedProducts: typeof products = [];
    while (selectedProducts.length < numItems) {
      const randProd = products[Math.floor(Math.random() * products.length)];
      if (!selectedProducts.includes(randProd)) {
        selectedProducts.push(randProd);
      }
    }

    const orderDetailsData = selectedProducts.map((p) => {
      const quantity = Math.floor(Math.random() * 2) + 1;
      return {
        product: p,
        quantity,
        unitPrice: Number(p.price),
      };
    });

    const subtotal = orderDetailsData.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const shippingFee = paymentMethod === "ONLINE" ? 0 : 30000;
    const vatAmount = Number((subtotal * 0.1).toFixed(2));
    const totalAmount = subtotal + shippingFee + vatAmount;
    
    const now = new Date();
    const orderAt = new Date(now.getTime() - (15 - i) * 24 * 60 * 60 * 1000); // Rải rác trong 15 ngày qua

    const order = new Order({
      customerIdOrder: customer._id,
      facility: facility._id,
      orderType: 1, // Member order
      status,
      subtotalAmount: subtotal,
      shippingFee,
      vatAmount,
      totalAmount,
      requireInvoice: i % 3 === 0, // 33% yêu cầu xuất hóa đơn đỏ
      shippingAddress: `${customer.address || "Hà Nội, Việt Nam"}`,
      note: i % 4 === 0 ? "Giao hàng giờ hành chính giúp em" : "",
      paymentMethod,
      orderAt,
    });

    // Cập nhật mốc thời gian dựa theo trạng thái
    if (status !== OrderStatus.PENDING) {
      order.confirmedAt = new Date(orderAt.getTime() + 2 * 60 * 60 * 1000); // xác nhận sau 2h
    }
    if ([OrderStatus.SHIPPING, OrderStatus.DELIVERED, OrderStatus.SUCCESSFUL].includes(status)) {
      order.staffIdOrder = staff[i % staff.length]._id; // Gán nhân viên phụ trách đóng gói
    }
    if (status === OrderStatus.DELIVERED || status === OrderStatus.SUCCESSFUL) {
      order.completedAt = new Date(orderAt.getTime() + 1 * 24 * 60 * 60 * 1000); // hoàn thành sau 1 ngày
    }
    if (status === OrderStatus.CANCELLED) {
      order.cancelAt = new Date(orderAt.getTime() + 4 * 60 * 60 * 1000);
      order.cancelReason = "Khách hàng đổi ý, muốn chọn sản phẩm khác";
    }

    await order.save();
    createdOrders.push(order);

    // Lưu chi tiết đơn hàng
    for (const item of orderDetailsData) {
      await OrderDetail.create({
        order: order._id,
        product: item.product._id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });

      // Trừ tồn kho nếu đơn đã ở trạng thái được xác nhận trở lên và chưa bị hủy
      if (status !== OrderStatus.PENDING && status !== OrderStatus.CANCELLED) {
        await Inventory.findOneAndUpdate(
          { facility: facility._id, product: item.product._id },
          { $inc: { quantity: -item.quantity } }
        );
      }
    }

    // Tạo hóa đơn & thanh toán tương ứng
    const invoiceNumber = `INV${orderAt.getFullYear()}${String(orderAt.getMonth() + 1).padStart(2, "0")}${String(orderAt.getDate()).padStart(2, "0")}${String(orderAt.getTime()).slice(-6)}`;
    
    // Trạng thái thanh toán
    let isPaid = false;
    if (paymentMethod === "ONLINE" && status !== OrderStatus.PENDING && status !== OrderStatus.CANCELLED) {
      isPaid = true;
    } else if (paymentMethod === "COD" && (status === OrderStatus.DELIVERED || status === OrderStatus.SUCCESSFUL)) {
      isPaid = true;
    }

    const payment = new Payment({
      order: order._id,
      amount: totalAmount,
      status: isPaid ? PaymentStatus.PAID : (status === OrderStatus.CANCELLED ? PaymentStatus.CANCELLED : PaymentStatus.PENDING),
      method: paymentMethod === "ONLINE" ? "PAYOS" : "COD",
      paidAt: isPaid ? new Date(orderAt.getTime() + 12 * 60 * 60 * 1000) : null,
    });
    await payment.save();

    const invoice = new Invoice({
      order: order._id,
      payment: payment._id,
      invoiceNumber,
      totalAmount,
      status: isPaid 
        ? InvoiceStatus.PAID 
        : (status === OrderStatus.CANCELLED ? InvoiceStatus.CANCELLED : InvoiceStatus.UNPAID),
      paymentMethod: paymentMethod === "ONLINE" ? "PAYOS" : "COD",
      paidAt: isPaid ? payment.paidAt : null,
      notes: `Hóa đơn giao dịch cho đơn ${order._id}`,
      taxAmount: vatAmount,
    });
    await invoice.save();
  }
  console.log(`✅ Đã tạo thành công 15 đơn hàng, chi tiết hóa đơn và thanh toán kèm trừ tồn kho tương ứng.`);

  // 6. Khởi tạo Đánh giá mẫu (Feedback) cho các sản phẩm đã giao thành công
  console.log("✍️  Đang tạo đánh giá sản phẩm mẫu...");
  const feedbackTemplates = [
    { rating: 5, content: "Sản phẩm dùng cực kỳ mượt mà, cấu hình mạnh mẽ, đóng gói cẩn thận và giao hàng rất nhanh!" },
    { rating: 5, content: "Hàng chính hãng, nguyên seal. Test hiệu năng rất ổn định, nhiệt độ mát mẻ." },
    { rating: 4, content: "Chất lượng sản phẩm rất tốt trong tầm giá, tuy nhiên nhân viên giao hàng hơi chậm một chút." },
    { rating: 5, content: "Dịch vụ của store tuyệt vời, nhắn tin hỗ trợ tư vấn nhiệt tình. 10 điểm không có nhưng!" },
    { rating: 3, content: "Sản phẩm dùng ổn, nhưng hộp hơi bị móp méo trong quá trình vận chuyển." },
  ];

  // Lọc ra các đơn hàng SUCCESSFUL hoặc DELIVERED để đánh giá
  const deliveredOrders = createdOrders.filter((o) => 
    [OrderStatus.DELIVERED, OrderStatus.SUCCESSFUL].includes(o.status)
  );

  for (let idx = 0; idx < deliveredOrders.length; idx++) {
    const order = deliveredOrders[idx];
    const details = await OrderDetail.find({ order: order._id });
    if (!details.length) continue;

    const template = feedbackTemplates[idx % feedbackTemplates.length];
    const customer = accounts.find((a) => a._id.toString() === order.customerIdOrder?.toString()) || customers[0];

    // Đánh giá sản phẩm đầu tiên trong đơn hàng
    const feedback = new Feedback({
      customerContent: template.content,
      product: details[0].product,
      customer: customer._id,
      order: order._id,
      rating: template.rating,
    });

    // 50% feedback được Manager trả lời phản hồi
    if (idx % 2 === 0) {
      feedback.manager = managers[idx % managers.length]._id;
      feedback.managerContent = `Cảm ơn quý khách ${customer.name} đã tin tưởng và ủng hộ Technical Store. Sự hài lòng của quý khách là động lực phát triển lớn nhất của chúng tôi!`;
    }

    await feedback.save();
  }
  console.log(`✅ Đã tạo thành công ${deliveredOrders.length} đánh giá khách hàng kèm phản hồi của quản lý.`);

  console.log("\n🎉 HOÀN THÀNH SEED DỮ LIỆU GIAO DỊCH MẪU THÀNH CÔNG!");
  await DbConnection.closeConnection();
}

seedTransactions().catch((err) => {
  console.error("❌ Seed giao dịch thất bại:", err);
  process.exit(1);
});
