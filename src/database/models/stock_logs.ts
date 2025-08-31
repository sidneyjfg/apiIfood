import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database';

export const StockLog = sequelize.define('StockLog', {
  product_sku: DataTypes.STRING,
  source: DataTypes.ENUM('ERP', 'IFOOD'),
  old_quantity: DataTypes.INTEGER,
  new_quantity: DataTypes.INTEGER,
  status: DataTypes.ENUM('SUCCESS', 'ERROR'),
  message: DataTypes.TEXT,
}, {
  tableName: 'stock_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});
