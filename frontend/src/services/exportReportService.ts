import { api, unwrapApiData } from './api';

export interface ExportReportProduct {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface ExportReportItem {
  exportCode: string;
  orderId: string;
  /** Website Order ID for Online, Invoice Number for POS */
  orderRef: string;
  exportType: 'Online' | 'POS';
  exportDate: string;
  products: ExportReportProduct[];
  totalQuantity: number;
  subtotalAmount: number;
  shippingFee: number;
  vatAmount: number;
  /** Final amount customer actually paid */
  totalAmount: number;
  paymentMethod: string | null;
  shippingAddress: string | null;
}

export interface ExportReportKpis {
  totalExportedQuantity: number;
  exportedOnline: number;
  exportedPos: number;
  totalExportTransactions: number;
}

export interface ExportReportPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface ExportReportResponse {
  kpis: ExportReportKpis;
  items: ExportReportItem[];
  pagination: ExportReportPagination;
}

export interface ExportReportQuery {
  timeRange?: 'all' | 'today' | 'week' | 'month' | 'custom';
  channel?: 'all' | 'online' | 'pos';
  search?: string;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

class ExportReportService {
  async getReport(query: ExportReportQuery): Promise<ExportReportResponse> {
    const response = await api.get('/reports/export', { params: query });
    return unwrapApiData<ExportReportResponse>(response);
  }
}

export const exportReportService = new ExportReportService();
