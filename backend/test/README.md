# Unit tests: auth, payment, customer và guest

Các test trong thư mục này dùng `node:test` và mock Mongoose/PayOS ở mức service. Vì vậy test không cần MongoDB, SMTP hay tài khoản PayOS thật.

## Chạy test

Từ thư mục gốc repository:

```powershell
npm.cmd test --workspace backend
```

Chạy riêng từng nhóm:

```powershell
npm.cmd run test:auth --workspace backend
npm.cmd run test:payment --workspace backend
npm.cmd run test:customer-guest --workspace backend
```

## Phạm vi

- `auth.service.test.ts`: đăng ký, OTP kích hoạt tài khoản, đăng nhập, khóa tài khoản, đổi mật khẩu, logout và access token.
- `payment.service.test.ts`: chuẩn hóa trạng thái, ownership customer/guest, tạo link PayOS và đồng bộ payment thành công.
- `customer-guest.service.test.ts`: validation guest checkout, tra cứu đơn guest, lịch sử/ownership/hủy đơn customer, feedback, merge giỏ và wishlist.

Test order cũ tại `src/modules/order/services/order.service.test.ts` vẫn được chạy cùng bộ test mới.
