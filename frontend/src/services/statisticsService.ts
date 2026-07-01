import { api, unwrapApiData } from './api';

export interface TopProduct {
  rank: number;
  name: string;
  revenue: number;
  quantity: number;
  growth: string;
  status: string;
}

export interface PaymentDistribution {
  method: string;
  count: number;
  percentage: number;
}

export interface RecentTransaction {
  id: string;
  entity: string;
  status: string;
  amount: number;
}

export interface RevenueTrendPoint {
  date: string;
  current: number;
  previous: number;
}

export interface DashboardStatistics {
  grossRevenue: number;
  netProfit: number;
  avgOrderValue: number;
  conversionRate: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  returnRate: number;
  topProducts: TopProduct[];
  paymentDistribution: PaymentDistribution[];
  recentTransactions: RecentTransaction[];
  revenueTrend: RevenueTrendPoint[];
}

// ---- Manager Detailed Stats ----

export interface OrderStatusBreakdown {
  total: number;
  pending: number;
  assigned: number;
  processing: number;
  shipping: number;
  delivered: number;
  deliveryFailed: number;
  cancelled: number;
  returned: number;
  successful: number;
}

export interface FacilityRevenue {
  facilityId: string | null;
  name: string;
  revenue: number;
  orderCount: number;
  share: number;
}

export interface CategoryRevenue {
  categoryId: string | null;
  name: string;
  revenue: number;
  quantitySold: number;
  share: number;
}

export interface TopCustomer {
  customerId: string;
  name: string;
  email: string;
  phone: string;
  orderCount: number;
  totalSpent: number;
}

export interface SlowMovingProduct {
  productId: string;
  name: string;
  categoryName: string;
  currentStock: number;
  sales30d: number;
  revenue30d: number;
}

export interface CustomerBreakdown {
  total: number;
  newLast30Days: number;
  returning: number;
}

export interface ManagerDetailedStats {
  orderStatusBreakdown: OrderStatusBreakdown;
  revenueByFacility: FacilityRevenue[];
  revenueByCategory: CategoryRevenue[];
  topCustomers: TopCustomer[];
  slowMovingProducts: SlowMovingProduct[];
  customerBreakdown: CustomerBreakdown;
}

class StatisticsService {
  async getDashboardData(): Promise<DashboardStatistics> {
    const response = await api.get('/statistics/dashboard');
    return unwrapApiData<DashboardStatistics>(response);
  }

  async getManagerDetailedStats(): Promise<ManagerDetailedStats> {
    const response = await api.get('/statistics/manager-stats');
    return unwrapApiData<ManagerDetailedStats>(response);
  }

  async exportReport(): Promise<void> {
    try {
      const response = await api.get('/statistics/export', {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sales-report-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting sales report:', error);
      throw error;
    }
  }
}

export const statisticsService = new StatisticsService();
