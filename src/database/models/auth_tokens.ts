// models/auth_tokens.ts
import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/database';

export class AuthToken extends Model {
  public id!: number;
  public merchant_id!: string;      // 🔧 novo
  public provider!: string;
  public access_token!: string;
  public refresh_token?: string | null; // 🔧 novo (opcional)
  public expires_at!: Date;
  public readonly created_at!: Date;
}

AuthToken.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

  merchant_id: { type: DataTypes.STRING(45), allowNull: false },           // 🔧

  provider: { type: DataTypes.STRING(32), allowNull: false },
  access_token: { type: DataTypes.TEXT, allowNull: false },
  refresh_token: { type: DataTypes.TEXT, allowNull: true },                // 🔧

  expires_at: { type: DataTypes.DATE, allowNull: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  modelName: 'AuthToken',
  tableName: 'auth_tokens',
  timestamps: false,
  indexes: [
    { name: 'uq_auth_tokens_merchant_provider', unique: true, fields: ['merchant_id', 'provider'] },
  ],
});
