import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/database';

export class Merchant extends Model {
  public id!: number;
  public merchant_id!: string;   // id real do iFood
  public name!: string;
  public active!: boolean;
  public webhook_secret?: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Merchant.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  merchant_id: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  webhook_secret: { type: DataTypes.STRING(128), allowNull: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  corporate_name: { type: DataTypes.STRING(160), allowNull: true },
}, {
  sequelize,
  modelName: 'Merchant',
  tableName: 'merchants',
  timestamps: false,
  indexes: [
    { name: 'uq_merchants_merchant_id', unique: true, fields: ['merchant_id'] },
  ],
});
