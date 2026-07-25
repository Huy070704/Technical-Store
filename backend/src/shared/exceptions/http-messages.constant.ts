export enum HttpMessages {
  _UNAUTHORIZED = "Phiên đăng nhập không hợp lệ hoặc đã hết hạn",
  _WRONG_CREDENTIALS = "Tên đăng nhập hoặc mật khẩu không chính xác",
  _WRONG_OLD_PASSWORD = "Mật khẩu cũ không chính xác",
  _NO_TOKEN = "Không tìm thấy mã làm mới phiên đăng nhập",
  _BAD_REQUEST = "Yêu cầu không hợp lệ",
  _USERNAME_EXISTED = "Email đã được sử dụng",
  _PHONE_EXISTED = "Số điện thoại đã được sử dụng",
}