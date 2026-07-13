import { api, unwrapApiData } from './api';

export interface InvoiceCustomer {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface InvoiceFacility {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
}

export interface InvoiceItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface InvoiceOrder {
  id: string;
  orderDate: string;
  orderType: number;
  totalAmount: number;
  subtotalAmount: number;
  vatAmount: number;
  shippingFee: number;
  customer: InvoiceCustomer | null;
  facility: InvoiceFacility | null;
  items: InvoiceItem[];
  guestName?: string | null;
  guestPhone?: string | null;
}

export type InvoiceStatus = 'UNPAID' | 'PAID' | 'CANCELLED';

export interface StaffInvoice {
  id: string;
  invoiceNumber: string | null;
  totalAmount: number;
  status: InvoiceStatus;
  paymentMethod: string | null;
  paidAt: string | null;
  notes: string | null;
  order: InvoiceOrder;
  createdAt: string;
  updatedAt: string;
}

type InvoiceListResponse = { invoices?: StaffInvoice[]; message?: string };
type InvoiceResponse = { invoice?: StaffInvoice; message?: string };

class InvoiceService {
  async getAll(): Promise<StaffInvoice[]> {
    try {
      const response = await api.get('/invoices');
      const data = unwrapApiData<InvoiceListResponse>(response);
      return Array.isArray(data?.invoices) ? data.invoices : [];
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  }

  async markAsPaid(id: string, paymentMethod: string): Promise<StaffInvoice> {
    const response = await api.patch(`/invoices/${id}/mark-paid`, { paymentMethod });
    const data = unwrapApiData<InvoiceResponse>(response);
    if (!data?.invoice) throw new Error('Invalid invoice response');
    return data.invoice;
  }

  async cancel(id: string): Promise<StaffInvoice> {
    const response = await api.patch(`/invoices/${id}/cancel`);
    const data = unwrapApiData<InvoiceResponse>(response);
    if (!data?.invoice) throw new Error('Invalid invoice response');
    return data.invoice;
  }
}

export const invoiceService = new InvoiceService();
