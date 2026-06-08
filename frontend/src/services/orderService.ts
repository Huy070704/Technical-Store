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

class OrderService {
  async createInStoreOrder(payload: CreateInStoreOrderPayload): Promise<CreatedOrder> {
    const response = await api.post('/orders/instore', payload);
    const data = unwrapApiData<CreateOrderResponse>(response);
    if (!data?.order) throw new Error('Invalid order response');
    return data.order;
  }
}

export const orderService = new OrderService();
