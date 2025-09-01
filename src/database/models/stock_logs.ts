// models/stock_logs.ts
import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database';

export const StockLog = sequelize.define('StockLog', {
  merchant_id: { type: DataTypes.STRING(45), allowNull: false },
  product_sku: { type: DataTypes.STRING(45), allowNull: false },

  source: { type: DataTypes.ENUM('ERP', 'IFOOD'), allowNull: false },
  old_quantity: { type: DataTypes.INTEGER, allowNull: true },
  new_quantity: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.ENUM('SUCCESS', 'ERROR'), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: true },

  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'stock_logs',
  modelName: 'StockLog',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { name: 'idx_stock_logs_merchant_sku', fields: ['merchant_id', 'product_sku'] },
  ],
});
