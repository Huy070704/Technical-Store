import { useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { formatVnd } from '@/utils/cartFormat';
import { formatDateTime } from '@/utils/dateFormatter';
import type { Order } from '@/types/order';

const statusLabel: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  ASSIGNED: 'Đã phân công',
  PROCESSING: 'Đang xử lý',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
  RETURNED: 'Trả hàng',
};

export const useInvoiceExport = () => {
  const exportToPDF = useCallback((order: Order) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const margin = 14;
    let y = margin;

    const addLine = (text: string, size = 10, bold = false) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, 182);
      doc.text(lines, margin, y);
      y += lines.length * (size * 0.45) + 2;
    };

    doc.setFillColor(183, 0, 17);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('TechnicalStore', margin, 12);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Hóa đơn bán hàng / VAT Invoice', margin, 20);

    doc.setTextColor(30, 30, 30);
    y = 38;

    addLine(`Mã đơn: #${order.id.slice(-8).toUpperCase()}`, 11, true);
    addLine(`Ngày đặt: ${formatDateTime(order.orderAt)}`);
    addLine(
      `Trạng thái: ${statusLabel[order.status] ?? order.status}`,
    );
    addLine(`Thanh toán: ${order.paymentMethod}`);
    addLine(`Địa chỉ giao: ${order.shippingAddress}`);

    y += 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, 196, y);
    y += 8;

    addLine('Chi tiết sản phẩm', 12, true);

    order.orderDetails?.forEach((detail, index) => {
      const name = detail.product?.name ?? 'Sản phẩm';
      const qty = detail.quantity;
      const lineTotal = Number(detail.unitPrice) * qty;
      addLine(
        `${index + 1}. ${name} × ${qty} — ${formatVnd(lineTotal)}`,
      );
    });

    y += 4;
    doc.line(margin, y, 196, y);
    y += 8;

    addLine(`Tạm tính: ${formatVnd(Number(order.subtotalAmount))}`);
    addLine(`Phí vận chuyển: ${formatVnd(Number(order.shippingFee))}`);
    addLine(`VAT (10%): ${formatVnd(Number(order.vatAmount))}`);
    addLine(`Tổng cộng: ${formatVnd(Number(order.totalAmount))}`, 12, true);

    y += 6;
    addLine('Cảm ơn quý khách đã mua sắm tại TechnicalStore!', 9);

    doc.save(`hoa-don-${order.id.slice(-8)}.pdf`);
  }, []);

  return { exportToPDF };
};
