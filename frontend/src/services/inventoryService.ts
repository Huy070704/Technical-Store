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

class InventoryService {
  async getReport(query: InventoryQuery): Promise<InventoryReportResponse> {
    const response = await api.get('/inventory/report', { params: query });
    return unwrapApiData<InventoryReportResponse>(response);
  }

  async exportReport(query: Omit<InventoryQuery, 'page' | 'limit'>): Promise<void> {
    try {
      const response = await api.get('/inventory/export', {
        params: query,
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bao-cao-ton-kho-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting inventory report:', error);
      throw error;
    }
  }
}

export const inventoryService = new InventoryService();
