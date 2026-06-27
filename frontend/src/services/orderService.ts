import { api, unwrapApiData } from './api';

export interface InStoreOrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface CreateInStoreOrderPayload {
  items: InStoreOrderItem[];
  paymentMethod: string;
  totalAmount: number;
  note?: string;
  customerName?: string;
  customerPhone?: string;
}

export interface CreatedOrder {
  id: string;
  orderDate: string;
  status: string;
  totalAmount: number;
  paymentMethod: string;
  note?: string;
}

type CreateOrderResponse = { order?: CreatedOrder; message?: string };

<<<<<<< Updated upstream
class OrderService {
=======
  async completeInStoreOrder(id: string): Promise<void> {
    try {
      await api.patch(`/orders/${id}/complete-instore`);
    } catch (error) {
      return handleApiError(error, 'Xác nhận thanh toán tiền mặt thất bại');
    }
  },

  async getInStorePayosLink(orderId: string): Promise<string> {
    try {
      const response = await api.post(`/payment/payos-link/${orderId}`, {});
      const data = unwrapApiData<{ checkoutUrl: string }>(response);
      return data.checkoutUrl;
    } catch (error) {
      return handleApiError(error, 'Không tạo được QR thanh toán');
    }
  },

  async getInStorePaymentStatus(orderId: string): Promise<string> {
    try {
      const response = await api.get(`/payment/status/${orderId}`);
      const data = unwrapApiData<{ payment: { status: string } }>(response);
      return data.payment?.status ?? 'unknown';
    } catch {
      return 'unknown';
    }
  },

>>>>>>> Stashed changes
  async createInStoreOrder(payload: CreateInStoreOrderPayload): Promise<CreatedOrder> {
    const response = await api.post('/orders/instore', payload);
    const data = unwrapApiData<CreateOrderResponse>(response);
    if (!data?.order) throw new Error('Invalid order response');
    return data.order;
  }
}

export const orderService = new OrderService();
