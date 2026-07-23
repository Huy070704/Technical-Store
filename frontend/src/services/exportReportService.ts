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

  async exportReport(query: Omit<ExportReportQuery, 'page' | 'limit'>): Promise<void> {
    await this.downloadExport('/reports/export/excel', query, 'bao-cao-xuat-kho');
  }

  private async downloadExport(
    url: string,
    query: Omit<ExportReportQuery, 'page' | 'limit'>,
    filenamePrefix: string,
  ): Promise<void> {
    try {
      const response = await api.get(url, {
        params: query,
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.setAttribute('download', `${filenamePrefix}-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Error exporting export report:', error);
      throw error;
    }
  }
}

export const exportReportService = new ExportReportService();
