import { api, unwrapApiData } from './api';
import type { CollectPaymentRequest, OrderDetail, OrderListResponse } from '@/types/order';

// ─── In-store order types ─────────────────────────────────────────────────────

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

// ─── Service ──────────────────────────────────────────────────────────────────

export const orderService = {
  async getOrders(params: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}): Promise<OrderListResponse> {
    const response = await api.get('/orders', { params });
    return unwrapApiData<OrderListResponse>(response);
  },

  async getOrderById(id: string): Promise<OrderDetail> {
    const response = await api.get(`/orders/${id}`);
    return unwrapApiData<OrderDetail>(response);
  },

  async confirmOrder(id: string): Promise<OrderDetail> {
    const response = await api.patch(`/orders/${id}/confirm`);
    return unwrapApiData<OrderDetail>(response);
  },

  async collectPayment(id: string, body: CollectPaymentRequest): Promise<OrderDetail> {
    const response = await api.patch(`/orders/${id}/collect-payment`, body);
    return unwrapApiData<OrderDetail>(response);
  },

  async confirmDelivery(id: string): Promise<OrderDetail> {
    const response = await api.patch(`/orders/${id}/deliver`);
    return unwrapApiData<OrderDetail>(response);
  },

  async createInStoreOrder(payload: CreateInStoreOrderPayload): Promise<CreatedOrder> {
    const response = await api.post('/orders/instore', payload);
    const data = unwrapApiData<CreateOrderResponse>(response);
    if (!data?.order) throw new Error('Invalid order response');
    return data.order;
  },
};
