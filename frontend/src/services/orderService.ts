
import { api, unwrapApiData } from './api';
import type {
  CreateOrderDto,
  Order,
  OrderStatistics,
  OrderStatus,
} from '@/types/order';

interface OrdersListResponse {
  message: string;
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface OrderResponse {
  message: string;
  order: Order;
}

interface CreateOrderResponse {
  message: string;
  order: Order;
}

interface StatisticsResponse {
  message: string;
  statistics: OrderStatistics;
}

const handleApiError = (error: unknown, fallback: string): never => {
  if (error && typeof error === 'object' && 'response' in error) {
    const res = (error as { response?: { data?: { message?: string } } })
      .response?.data;
    throw new Error(res?.message ?? fallback);
  }
  if (error instanceof Error) {
    throw error;
  }
  throw new Error(fallback);
};

export const orderService = {
  async createOrder(dto: CreateOrderDto): Promise<Order> {
    try {
      const response = await api.post('/orders', dto);
      const data = unwrapApiData<CreateOrderResponse>(response);
      return data.order;
    } catch (error) {
      return handleApiError(error, 'Đặt hàng thất bại');
    }
  },

  async getOrders(params: { page?: number; limit?: number } = {}): Promise<OrdersListResponse> {
    try {
      const query = new URLSearchParams();
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      const qs = query.toString();
      const response = await api.get(`/orders${qs ? `?${qs}` : ''}`);
      return unwrapApiData<OrdersListResponse>(response);
    } catch (error) {
      return handleApiError(error, 'Không thể lấy danh sách đơn hàng');
    }
  },

  async getOrderStatistics(): Promise<OrderStatistics> {
    try {
      const response = await api.get('/orders/statistics');
      const data = unwrapApiData<StatisticsResponse>(response);
      return data.statistics;
    } catch (error) {
      return handleApiError(error, 'Không thể lấy thống kê đơn hàng');
    }
  },

  async getOrderById(id: string): Promise<Order> {
    try {
      const response = await api.get(`/orders/${id}`);
      const data = unwrapApiData<OrderResponse>(response);
      return data.order;
    } catch (error) {
      return handleApiError(error, 'Không thể lấy thông tin đơn hàng');
    }
  },

  async updateOrderStatus(
    id: string,
    status: OrderStatus,
    cancelReason?: string,
  ): Promise<Order> {
    try {
      const response = await api.patch(`/orders/${id}/status`, {
        status,
        cancelReason,
      });
      const data = unwrapApiData<OrderResponse>(response);
      return data.order;
    } catch (error) {
      return handleApiError(error, 'Cập nhật trạng thái đơn hàng thất bại');
    }
  },

  async confirmDelivery(id: string): Promise<Order> {
    try {
      const response = await api.post(`/orders/${id}/confirm-delivery`);
      const data = unwrapApiData<OrderResponse>(response);
      return data.order;
    } catch (error) {
      return handleApiError(error, 'Xác nhận đã nhận hàng thất bại');
    }
=======
﻿import { api, unwrapApiData } from './api';
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
