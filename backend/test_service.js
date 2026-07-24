require('reflect-metadata');
const mongoose = require('mongoose');
const { Container } = require('typedi');
const { StatisticService } = require('./dist/modules/statistics/services/statistic.service') || require('./src/modules/statistics/services/statistic.service');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/Technical-Store');
  
  // Use ts-node if running from src
  require('ts-node').register();
  const { StatisticService } = require('./src/modules/statistics/services/statistic.service');
  
  const service = new StatisticService();
  
  const data = await service.getAdminDashboardData({ timeRange: '30days' });
  console.log('KPIs:', JSON.stringify(data.kpis, null, 2));
  
  process.exit(0);
}
run().catch(console.error);
