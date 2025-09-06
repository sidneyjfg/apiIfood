// models/erp_location.ts
import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

export interface ErpLocationAttrs {
  id: number;
  code: string;     // ex.: LOJA_X, CD_01
  name: string;
  active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export type ErpLocationCreationAttrs = Optional<ErpLocationAttrs, 'id' | 'active' | 'created_at' | 'updated_at'>;

export class ErpLocation extends Model<ErpLocationAttrs, ErpLocationCreationAttrs>
  implements ErpLocationAttrs {
  public id!: number;
  public code!: string;
  public name!: string;
  public active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // helper: normaliza code
  public static normalizeCode(code: string) {
    return code.trim().toUpperCase();
  }
}

ErpLocation.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  code: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
    set(v: string) {
      this.setDataValue('code', ErpLocation.normalizeCode(v));
    },
    validate: {
      len: { args: [2, 64], msg: 'code deve ter entre 2 e 64 caracteres' },
      is: { args: [/^[A-Z0-9_\-]+$/], msg: 'code aceita apenas A-Z, 0-9, _ e -' },
    },
  },

  name: {
    type: DataTypes.STRING(160),
    allowNull: false,
    validate: { len: { args: [2, 160], msg: 'name deve ter entre 2 e 160 caracteres' } },
  },

  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  modelName: 'ErpLocation',
  tableName: 'erp_locations',
  timestamps: false,        // usa created_at/updated_at manuais
  underscored: true,
  indexes: [
    { name: 'uq_erp_locations_code', unique: true, fields: ['code'] },
    { name: 'idx_erp_locations_active', fields: ['active'] },
  ],
});
