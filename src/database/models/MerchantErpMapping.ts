// models/merchant_erp_mapping.ts
import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

export interface MerchantErpMappingAttrs {
  id: number;
  merchant_id: string;     // merchant do iFood
  erp_location_id: number; // FK -> erp_locations.id
  created_at?: Date;
  updated_at?: Date;
}

export type MerchantErpMappingCreationAttrs =
  Optional<MerchantErpMappingAttrs, 'id' | 'created_at' | 'updated_at'>;

export class MerchantErpMapping
  extends Model<MerchantErpMappingAttrs, MerchantErpMappingCreationAttrs>
  implements MerchantErpMappingAttrs {
  public id!: number;
  public merchant_id!: string;
  public erp_location_id!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

MerchantErpMapping.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  merchant_id: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true, // 1 iFood merchant -> 1 location
    validate: { len: { args: [2, 64], msg: 'merchant_id deve ter entre 2 e 64 caracteres' } },
  },

  erp_location_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    // opcional: validação referencial em nível de app, se quiser checar existência via hook
  },

  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  modelName: 'MerchantErpMapping',
  tableName: 'merchant_erp_mappings',
  timestamps: false,
  underscored: true,
  indexes: [
    { name: 'uq_mapping_merchant', unique: true, fields: ['merchant_id'] },
    { name: 'idx_mapping_location', fields: ['erp_location_id'] },
  ],
});
