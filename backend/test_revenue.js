const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/Technical-Store');
  
  const orderCol = mongoose.connection.collection('orders');
  const invoiceCol = mongoose.connection.collection('invoices');
  
  const now = new Date('2026-07-24T16:40:01+07:00'); // the time of the user's screenshot roughly
  
  const currentStart = new Date(now); currentStart.setDate(now.getDate() - 29); currentStart.setHours(0,0,0,0);
  const currentEnd = new Date(now); currentEnd.setHours(23,59,59,999);
  
  const prevStart = new Date(now); prevStart.setDate(now.getDate() - 59); prevStart.setHours(0,0,0,0);
  const prevEnd = new Date(now); prevEnd.setDate(now.getDate() - 30); prevEnd.setHours(23,59,59,999);
  
  const currentOrders = await orderCol.find({ orderAt: { $gte: currentStart, $lte: currentEnd }, status: { $in: ['SUCCESSFUL', 'DELIVERED'] } }).toArray();
  const prevOrders = await orderCol.find({ orderAt: { $gte: prevStart, $lte: prevEnd }, status: { $in: ['SUCCESSFUL', 'DELIVERED'] } }).toArray();
  
  const currentOrderIds = currentOrders.map(o => o._id);
  const prevOrderIds = prevOrders.map(o => o._id);
  
  const currentPaidInvoices = await invoiceCol.find({ order: { $in: currentOrderIds }, status: 'PAID' }).toArray();
  const prevPaidInvoices = await invoiceCol.find({ order: { $in: prevOrderIds }, status: 'PAID' }).toArray();
  
  const currentPaidOrderIds = new Set(currentPaidInvoices.map(inv => inv.order.toString()));
  const prevPaidOrderIds = new Set(prevPaidInvoices.map(inv => inv.order.toString()));
  
  const currentNetRevenueOrders = currentOrders.filter(o => currentPaidOrderIds.has(o._id.toString()));
  const prevNetRevenueOrders = prevOrders.filter(o => prevPaidOrderIds.has(o._id.toString()));
  
  const totalRevenue = currentNetRevenueOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const prevRevenue = prevNetRevenueOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  
  console.log('totalRevenue:', totalRevenue);
  console.log('prevRevenue:', prevRevenue);
  console.log('growthPercentage:', prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : (totalRevenue > 0 ? 100 : 0));
  
  process.exit(0);
}
run().catch(console.error);
