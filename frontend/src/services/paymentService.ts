import { api, unwrapApiData } from './api';
import type { PaymentStatus } from '@/types/order';

interface PayosLinkResponse {
  message: string;
  checkoutUrl: string;
  success: boolean;
}

interface PaymentStatusResponse {
  message: string;
  payment: PaymentStatus;
}

export const paymentService = {
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
};
