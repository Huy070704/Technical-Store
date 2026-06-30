import { api, unwrapApiData } from './api';

export interface InventoryBreakdown {
  facilityId: string;
  facilityName: string;
  stock: number;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  categoryName: string;
  totalStock: number;
  breakdown: InventoryBreakdown[];
  unitPrice: number;
  totalValue: number;
  status: 'Stable' | 'Low Stock' | 'Out of Stock';
}

export interface InventoryPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface InventoryKpis {
  totalInventoryValue: number;
  lowStockAlerts: number;
  highestStockFacility: { name: string; stock: number };
  lowestStockFacility: { name: string; stock: number };
  unusualActivities: {
    count: number;
    list: { id: string; message: string; time: string }[];
  };
}

export interface InventoryReportResponse {
  items: InventoryItem[];
  pagination: InventoryPagination;
  kpis: InventoryKpis;
  facilities: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}

export interface InventoryQuery {
  facilityId?: string;
  categoryId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type StockAdjustmentMode = 'set' | 'add' | 'subtract';

export interface AdjustStockPayload {
  productId: string;
  facilityId: string;
  mode: StockAdjustmentMode;
  quantity: number;
  reason?: string;
}

export interface AdjustStockResult {
  productId: string;
  facilityId: string;
  facilityName: string;
  productName: string;
  previousQuantity: number;
  newQuantity: number;
  mode: StockAdjustmentMode;
  reason: string | null;
}

class InventoryService {
  async getReport(query: InventoryQuery): Promise<InventoryReportResponse> {
    const response = await api.get('/inventory/report', { params: query });
    return unwrapApiData<InventoryReportResponse>(response);
  }

  async getManagerReport(query: InventoryQuery): Promise<InventoryReportResponse> {
    const response = await api.get('/inventory/manager/report', { params: query });
    return unwrapApiData<InventoryReportResponse>(response);
  }

  async adjustStock(payload: AdjustStockPayload): Promise<AdjustStockResult> {
    const response = await api.patch('/inventory/adjust', payload);
    return unwrapApiData<AdjustStockResult>(response);
  }

  async exportReport(query: Omit<InventoryQuery, 'page' | 'limit'>): Promise<void> {
    await this.downloadExport('/inventory/export', query, 'bao-cao-ton-kho');
  }

  async exportManagerReport(query: Omit<InventoryQuery, 'page' | 'limit'>): Promise<void> {
    await this.downloadExport('/inventory/manager/export', query, 'bao-cao-ton-kho-manager');
  }

  private async downloadExport(
    url: string,
    query: Omit<InventoryQuery, 'page' | 'limit'>,
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
      console.error('Error exporting inventory report:', error);
      throw error;
    }
  }
}

export const inventoryService = new InventoryService();
