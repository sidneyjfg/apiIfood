import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/database';

export class UserApiIfood extends Model {
  public id!: number;
  public client_id!: string;
  public client_secret!: string;
  public access_token?: string | null;
  public refresh_token?: string | null;
  public expires_at?: Date | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

UserApiIfood.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  client_id: { type: DataTypes.STRING(128), allowNull: false, unique: true },
  client_secret: { type: DataTypes.STRING(256), allowNull: false },
  access_token: { type: DataTypes.TEXT, allowNull: true },
  refresh_token: { type: DataTypes.TEXT, allowNull: true },
  expires_at: { type: DataTypes.DATE, allowNull: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  modelName: 'UserApiIfood',
  tableName: 'user_api_ifood',
  timestamps: false,
  indexes: [
    { name: 'uq_user_api_ifood_client_id', unique: true, fields: ['client_id'] },
  ],
});
