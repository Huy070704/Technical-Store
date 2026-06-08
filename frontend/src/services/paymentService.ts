import { api, unwrapApiData } from './api';

export interface PaymentCustomer {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface PaymentOrder {
  id: string;
  orderDate: string;
  totalAmount: number;
  customer: PaymentCustomer | null;
}

export interface StaffPayment {
  id: string;
  amount: number;
  status: string;
  method: string;
  payosOrderCode: string | null;
  order: PaymentOrder;
  createdAt: string;
  updatedAt: string;
}

type PaymentListResponse = { payments?: StaffPayment[]; message?: string };
type PaymentResponse = { payment?: StaffPayment; message?: string };

class PaymentService {
  async getAll(): Promise<StaffPayment[]> {
    try {
      const response = await api.get('/payments');
      const data = unwrapApiData<PaymentListResponse>(response);
      return Array.isArray(data?.payments) ? data.payments : [];
    } catch (error) {
      console.error('Error fetching payments:', error);
      return [];
    }
  }

  async confirm(id: string): Promise<StaffPayment> {
    const response = await api.patch(`/payments/${id}/confirm`);
    const data = unwrapApiData<PaymentResponse>(response);
    if (!data?.payment) throw new Error('Invalid payment response');
    return data.payment;
  }
}

export const paymentService = new PaymentService();
