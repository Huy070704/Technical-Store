import type { OrderDetail } from '@/types/order';

// ─── helpers ──────────────────────────────────────────────────────────────────

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const vnd = (n: number): string => `${Number(n || 0).toLocaleString('vi-VN')} ₫`;

const dateTime = (d?: string): string => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const isPaid = (p: { status?: unknown }) => {
  const s = String(p.status ?? '').toLowerCase();
  return s === 'paid' || s === 'completed';
};

// ─── shared shell ─────────────────────────────────────────────────────────────

const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2430; padding: 32px 36px; font-size: 13px; line-height: 1.5; }
  .brand { display: flex; align-items: center; justify-content: space-between; background: #b70011; color: #fff; border-radius: 12px; padding: 18px 22px; }
  .brand .logo { font-size: 22px; font-weight: 800; letter-spacing: .3px; }
  .brand .doc { text-align: right; }
  .brand .doc .t { font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
  .brand .doc .s { font-size: 11px; opacity: .85; margin-top: 2px; }
  .meta { display: flex; flex-wrap: wrap; gap: 4px 24px; margin: 18px 2px 6px; color: #555; font-size: 12px; }
  .meta b { color: #1f2430; }
  .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 14px 0 20px; }
  .card { border: 1px solid #e6e8ec; border-radius: 12px; padding: 14px 16px; background: #fbfbfc; }
  .card h3 { font-size: 12px; text-transform: uppercase; letter-spacing: .4px; color: #8a8f9a; margin-bottom: 10px; }
  .row { display: flex; justify-content: space-between; gap: 12px; padding: 3px 0; }
  .row .k { color: #6b7280; }
  .row .v { font-weight: 600; text-align: right; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; border: 1px solid #e6e8ec; border-radius: 12px; overflow: hidden; }
  thead th { background: #f4f5f7; color: #55606e; font-size: 11px; text-transform: uppercase; letter-spacing: .3px; text-align: left; padding: 10px 12px; }
  tbody td { padding: 10px 12px; border-top: 1px solid #eef0f3; }
  tbody tr:nth-child(even) td { background: #fafbfc; }
  .right { text-align: right; }
  tfoot td { padding: 12px; border-top: 2px solid #e6e8ec; font-weight: 700; background: #f9fafb; }
  tfoot .grand { color: #b70011; font-size: 15px; }
  .pay { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 18px 0 4px; }
  .pay .box { border: 1px solid #e6e8ec; border-radius: 10px; padding: 12px; text-align: center; }
  .pay .box .lbl { font-size: 11px; color: #8a8f9a; text-transform: uppercase; letter-spacing: .3px; }
  .pay .box .amt { font-size: 16px; font-weight: 800; margin-top: 4px; }
  .pay .box.paid .amt { color: #16a34a; }
  .pay .box.remain .amt { color: #d97706; }
  .badge { display: inline-block; margin-top: 12px; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 700; }
  .badge.ok { background: #dcfce7; color: #15803d; }
  .badge.no { background: #fef3c7; color: #b45309; }
  .note { margin-top: 14px; font-size: 12px; color: #555; }
  .sign { display: flex; justify-content: space-between; margin-top: 44px; }
  .sign .col { text-align: center; width: 200px; }
  .sign .col .role { font-weight: 700; margin-bottom: 56px; }
  .sign .col .line { border-top: 1px solid #b6bcc6; padding-top: 6px; color: #8a8f9a; font-size: 12px; }
  .foot { margin-top: 28px; text-align: center; color: #9aa0aa; font-size: 11px; }
`;

const wrapDoc = (title: string, docTitle: string, body: string): string => `
  <html><head><meta charset="utf-8"><title>${esc(title)}</title>
  <style>${BASE_CSS}</style></head>
  <body>
    <div class="brand">
      <div class="logo">TechnicalStore</div>
      <div class="doc">
        <div class="t">${esc(docTitle)}</div>
        <div class="s">TechnicalStore · Hệ thống bán lẻ thiết bị công nghệ</div>
      </div>
    </div>
    ${body}
    <div class="foot">Phiếu được tạo tự động từ hệ thống TechnicalStore.</div>
  </body></html>
`;

const productRows = (order: OrderDetail): string =>
  order.items
    .map(
      (item, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${esc(item.productName)}</td>
        <td class="right">${vnd(item.unitPrice)}</td>
        <td class="right">${item.quantity}</td>
        <td class="right">${vnd(item.subtotal)}</td>
      </tr>`,
    )
    .join('');

// ─── Hóa đơn giao hàng ─────────────────────────────────────────────────────────

export const deliveryInvoiceHtml = (order: OrderDetail): string => {
  const invoice = (order.invoices[order.invoices.length - 1] ?? null) as
    | { invoiceNumber?: string }
    | null;

  const paid = order.payments.filter(isPaid).reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, order.totalAmount - paid);

  const body = `
    <div class="meta">
      <span><b>Số hóa đơn:</b> ${esc(invoice?.invoiceNumber ?? '—')}</span>
      <span><b>Mã đơn:</b> #${esc(order.id.slice(0, 8).toUpperCase())}</span>
      <span><b>Ngày:</b> ${dateTime(order.orderDate)}</span>
    </div>

    <div class="cards">
      <div class="card">
        <h3>Người nhận</h3>
        <div class="row"><span class="k">Họ tên</span><span class="v">${esc(order.customer?.name || 'Khách vãng lai')}</span></div>
        <div class="row"><span class="k">Số điện thoại</span><span class="v">${esc(order.customer?.phone || '—')}</span></div>
      </div>
      <div class="card">
        <h3>Thông tin giao hàng</h3>
        <div class="row"><span class="k">Địa chỉ</span><span class="v">${esc(order.shippingAddress || '—')}</span></div>
        <div class="row"><span class="k">Ngày giao</span><span class="v">${dateTime(order.completedAt || order.orderDate)}</span></div>
        <div class="row"><span class="k">Trạng thái</span><span class="v">Đã giao</span></div>
      </div>
    </div>

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
      <tbody>${productRows(order)}</tbody>
      <tfoot>
        <tr>
          <td colspan="4">Tổng cộng</td>
          <td class="right grand">${vnd(order.totalAmount)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="pay">
      <div class="box"><div class="lbl">Tổng đơn</div><div class="amt">${vnd(order.totalAmount)}</div></div>
      <div class="box paid"><div class="lbl">Đã thu</div><div class="amt">${vnd(paid)}</div></div>
      <div class="box remain"><div class="lbl">Còn lại</div><div class="amt">${vnd(remaining)}</div></div>
    </div>

    <div class="sign">
      <div class="col"><div class="role">Khách hàng</div><div class="line">(Ký, ghi rõ họ tên)</div></div>
      <div class="col"><div class="role">Nhân viên giao</div><div class="line">(Ký, ghi rõ họ tên)</div></div>
    </div>
  `;

  return wrapDoc(
    `Hóa đơn giao hàng - ${invoice?.invoiceNumber ?? order.id.slice(0, 8)}`,
    'Hóa đơn giao hàng',
    body,
  );
};

// ─── Phiếu xuất kho ────────────────────────────────────────────────────────────

export const exportSlipHtml = (order: OrderDetail): string => {
  const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);

  const body = `
    <div class="meta">
      <span><b>Mã đơn:</b> #${esc(order.id.slice(0, 8).toUpperCase())}</span>
      <span><b>Ngày lập:</b> ${dateTime(order.orderDate)}</span>
    </div>

    <div class="cards">
      <div class="card">
        <h3>Thông tin khách hàng</h3>
        <div class="row"><span class="k">Họ tên</span><span class="v">${esc(order.customer?.name || 'Khách vãng lai')}</span></div>
        <div class="row"><span class="k">Điện thoại</span><span class="v">${esc(order.customer?.phone || '—')}</span></div>
      </div>
      <div class="card">
        <h3>Thông tin giao hàng</h3>
        <div class="row"><span class="k">Địa chỉ</span><span class="v">${esc(order.shippingAddress || '—')}</span></div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:36px;">STT</th>
          <th>Tên sản phẩm</th>
          <th class="right">Đơn giá</th>
          <th class="right">SL</th>
          <th class="right">Thành tiền</th>
        </tr>
      </thead>
      <tbody>${productRows(order)}</tbody>
      <tfoot>
        <tr>
          <td colspan="3">Tổng cộng</td>
          <td class="right">${totalQty}</td>
          <td class="right grand">${vnd(order.totalAmount)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="sign">
      <div class="col" style="margin-left:auto;"><div class="role">Nhân viên xuất kho</div><div class="line">(Ký, ghi rõ họ tên)</div></div>
    </div>
  `;

  return wrapDoc(
    `Phiếu xuất kho - ${order.id.slice(0, 8).toUpperCase()}`,
    'Phiếu xuất kho',
    body,
  );
};
