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

// ─── Revenue Management Types ────────────────────────────────────────────────

export interface RevenueKpis {
  grossRevenue: number;
  netRevenue: number;
  successfulOrderCount: number;
  avgOrderValue: number;
}

export interface RevenueTrendBucket {
  label: string;
  pos: number;
  online: number;
}

export interface RevenueTopProduct {
  rank: number;
  name: string;
  quantitySold: number;
  totalRevenue: number;
}

export interface RevenuePaymentDistribution {
  method: string;
  revenue: number;
  count: number;
  percentage: number;
}

export interface RevenueTransaction {
  transactionDate: string;
  orderCode: string;
  salesChannel: string;
  paymentMethod: string;
  amount: number;
  paymentStatus: string;
}

export interface RevenueStatistics {
  kpis: RevenueKpis;
  revenueTrend: RevenueTrendBucket[];
  topProducts: RevenueTopProduct[];
  paymentDistribution: RevenuePaymentDistribution[];
  transactionHistory: RevenueTransaction[];
}

export interface RevenueQuery {
  channel?: 'all' | 'online' | 'pos';
  timeRange?: 'today' | '7days' | '30days' | 'custom';
  startDate?: string;
  endDate?: string;
}

// ─────────────────────────────────────────────────────────────────────────────

class StatisticsService {
  async getDashboardData(): Promise<DashboardStatistics> {
    const response = await api.get('/statistics/dashboard');
    return unwrapApiData<DashboardStatistics>(response);
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

  async getRevenueData(query: RevenueQuery = {}): Promise<RevenueStatistics> {
    const params: Record<string, string> = {};
    if (query.channel && query.channel !== 'all') params.channel = query.channel;
    if (query.timeRange) params.timeRange = query.timeRange;
    if (query.startDate) params.startDate = query.startDate;
    if (query.endDate) params.endDate = query.endDate;
    const response = await api.get('/statistics/revenue', { params });
    return unwrapApiData<RevenueStatistics>(response);
  }
}

export const statisticsService = new StatisticsService();

