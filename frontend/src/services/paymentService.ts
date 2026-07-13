import { api, unwrapApiData } from './api';
import type { PaymentStatus } from '@/types/order';

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
  paidAt: string | null;
  order: PaymentOrder;
  createdAt: string;
  updatedAt: string;
}

interface PayosLinkResponse {
  message: string;
  checkoutUrl: string;
  success: boolean;
}

interface PaymentStatusResponse {
  message: string;
  payment: PaymentStatus;
}

type PaymentListResponse = { payments?: StaffPayment[]; message?: string };
type PaymentResponse = { payment?: StaffPayment; message?: string };

export const paymentService = {
  // ─── Customer-facing methods ───────────────────────────────────────────────
  async createPayosLink(
    orderId: string,
    guestEmail?: string,
  ): Promise<string> {
    const response = await api.post(`/payment/payos-link/${orderId}`, {
      email: guestEmail,
    });
    const data = unwrapApiData<PayosLinkResponse>(response);
    return data.checkoutUrl;
  },

  async getPaymentStatus(orderId: string): Promise<PaymentStatus> {
    const response = await api.get(`/payment/status/${orderId}`);
    const data = unwrapApiData<PaymentStatusResponse>(response);
    return data.payment;
  },

  // ─── Staff-facing methods ───────────────────────────────────────────────────
  async getAll(): Promise<StaffPayment[]> {
    try {
      const response = await api.get('/payments');
      const data = unwrapApiData<PaymentListResponse>(response);
      return Array.isArray(data?.payments) ? data.payments : [];
    } catch (error) {
      console.error('Error fetching payments:', error);
      return [];
    }
  },

  async confirm(id: string): Promise<StaffPayment> {
    const response = await api.patch(`/payments/${id}/confirm`);
    const data = unwrapApiData<PaymentResponse>(response);
    if (!data?.payment) throw new Error('Invalid payment response');
    return data.payment;
  },
};
