import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../../config/database';

export class AuthToken extends Model {
  public id!: number;
  public provider!: string;
  public access_token!: string;
  public expires_at!: Date;
  public readonly created_at!: Date;
}

AuthToken.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  provider: {
    type: DataTypes.STRING,
    allowNull: false
  },
  access_token: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'AuthToken',
  tableName: 'auth_tokens',
  timestamps: false
});
