import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { OrderHistory } from '@/components/order/OrderHistory';
import { orderService } from '@/services/orderService';
import type { Order, OrderStatistics } from '@/types/order';
import { cart } from '@/styles/cartClasses';

export const OrderHistoryPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statistics, setStatistics] = useState<OrderStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as { message?: string } | null;
    if (state?.message) {
      setFlashMessage(state.message);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const fetchOrders = useCallback(async (page: number, status = 'all') => {
    try {
      setLoading(true);
      setError(null);
      const [data, stats] = await Promise.all([
        orderService.getOrders({ page, limit: 10, status }),
        orderService.getOrderStatistics(),
      ]);
      setOrders(data.orders);
      setTotalOrders(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
      setStatistics(stats);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không tải được đơn hàng',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders(currentPage, statusFilter);
  }, [currentPage, statusFilter, fetchOrders]);

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  return (
    <div className="pt-[95px]">
      <div className="mx-auto w-full max-w-page px-4 py-8 md:px-8">
        {flashMessage && (
          <div className={`${cart.alertBase} ${cart.alertSuccess} mb-4`}>
            {flashMessage}
          </div>
        )}
        {error && (
          <div className={`${cart.alertBase} ${cart.alertWarning} mb-4`}>
            {error}
          </div>
        )}
        {loading ? (
          <p className="text-body-sm text-secondary">Đang tải đơn hàng...</p>
        ) : (
          <OrderHistory
            orders={orders}
            statistics={statistics}
            onOrderUpdate={setOrders}
            currentPage={currentPage}
            totalPages={totalPages}
            totalOrders={totalOrders}
            onPageChange={setCurrentPage}
            statusFilter={statusFilter}
            onStatusFilterChange={handleStatusFilterChange}
          />
        )}
      </div>
    </div>
  );
};
