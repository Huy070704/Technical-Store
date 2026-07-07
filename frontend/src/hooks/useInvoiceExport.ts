import { useCallback } from 'react';
import { formatVnd } from '@/utils/cartFormat';
import { formatDateTime } from '@/utils/dateFormatter';
import { exportHtmlStringToPdf } from '@/utils/pdfExport';
import type { Order } from '@/types/order';

const statusLabel: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  PROCESSING: 'Đang xử lý',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  SUCCESSFUL: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export const useInvoiceExport = () => {
  const exportToPDF = useCallback(async (order: Order) => {
    const rows = (order.orderDetails ?? [])
      .map((detail, index) => {
        const name = esc(detail.product?.name ?? 'Sản phẩm');
        const qty = detail.quantity;
        const unit = Number(detail.unitPrice);
        const lineTotal = unit * qty;
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${name}</td>
            <td class="right">${formatVnd(unit)}</td>
            <td class="right">${qty}</td>
            <td class="right">${formatVnd(lineTotal)}</td>
          </tr>`;
      })
      .join('');

    const fullHtml = `
      <html><head><title>Hóa đơn ${esc(order.id.slice(-8).toUpperCase())}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 24px; color: #1a1a1a; margin: 0; }
        .brand { background: #b70011; color: #fff; padding: 18px 24px; margin: -24px -24px 20px; }
        .brand h1 { font-size: 22px; margin: 0; }
        .brand p { font-size: 12px; margin: 4px 0 0; opacity: .9; }
        h2 { font-size: 15px; margin: 20px 0 8px; }
        .info { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; font-size: 13px; margin-bottom: 8px; }
        .info span.k { color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
        th { background: #f4f4f4; text-align: left; padding: 8px 10px; border-bottom: 2px solid #ddd; }
        td { padding: 8px 10px; border-bottom: 1px solid #eee; }
        .right { text-align: right; }
        .totals { margin-top: 16px; margin-left: auto; width: 55%; font-size: 13px; }
        .totals .row { display: flex; justify-content: space-between; padding: 4px 0; }
        .totals .grand { border-top: 2px solid #ddd; margin-top: 4px; padding-top: 8px; font-size: 15px; font-weight: bold; color: #b70011; }
        .thanks { margin-top: 28px; font-size: 12px; color: #666; text-align: center; }
      </style></head><body>
        <div class="brand">
          <h1>TechnicalStore</h1>
          <p>Hóa đơn bán hàng / VAT Invoice</p>
        </div>

        <div class="info">
          <div><span class="k">Mã đơn:</span> <strong>#${esc(order.id.slice(-8).toUpperCase())}</strong></div>
          <div><span class="k">Ngày đặt:</span> ${esc(formatDateTime(order.orderAt))}</div>
          <div><span class="k">Trạng thái:</span> ${esc(statusLabel[order.status] ?? order.status)}</div>
          <div><span class="k">Thanh toán:</span> ${esc(order.paymentMethod)}</div>
          <div style="grid-column: 1 / -1;"><span class="k">Địa chỉ giao:</span> ${esc(order.shippingAddress)}</div>
        </div>

        <h2>Chi tiết sản phẩm</h2>
        <table>
          <thead>
            <tr>
              <th style="width:36px;">#</th>
              <th>Sản phẩm</th>
              <th class="right">Đơn giá</th>
              <th class="right">SL</th>
              <th class="right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="totals">
          <div class="row"><span>Tạm tính</span><span>${formatVnd(Number(order.subtotalAmount))}</span></div>
          <div class="row"><span>Phí vận chuyển</span><span>${formatVnd(Number(order.shippingFee))}</span></div>
          <div class="row"><span>VAT (10%)</span><span>${formatVnd(Number(order.vatAmount))}</span></div>
          <div class="row grand"><span>Tổng cộng</span><span>${formatVnd(Number(order.totalAmount))}</span></div>
        </div>

        <p class="thanks">Cảm ơn quý khách đã mua sắm tại TechnicalStore!</p>
      </body></html>
    `;

    await exportHtmlStringToPdf(fullHtml, `hoa-don-${order.id.slice(-8)}.pdf`);
  }, []);

  return { exportToPDF };
};
