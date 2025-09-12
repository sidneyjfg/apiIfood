// @db/models/erpSaleLink.ts
import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '@config/database';

interface ErpSaleLinkAttrs {
  id: string;
  merchant_id: string;
  order_id: string;
  idempotency_key: string;
  erp_sale_id: string | null;
  erp_sale_codigo: string | null;
  cliente_id: string | null;
  loja_id: string | null;
  status: string | null; // ex.: 'CREATED' | 'CANCELLED' | 'FINALIZED'
  created_at?: Date;
  updated_at?: Date;
}
type ErpSaleLinkCreation = Optional<ErpSaleLinkAttrs, 'id' | 'erp_sale_id' | 'erp_sale_codigo' | 'cliente_id' | 'loja_id' | 'status'>;

export class ErpSaleLink extends Model<ErpSaleLinkAttrs, ErpSaleLinkCreation> implements ErpSaleLinkAttrs {
  declare id: string;
  declare merchant_id: string;
  declare order_id: string;
  declare idempotency_key: string;
  declare erp_sale_id: string | null;
  declare erp_sale_codigo: string | null;
  declare cliente_id: string | null;
  declare loja_id: string | null;
  declare status: string | null;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

ErpSaleLink.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    merchant_id: { type: DataTypes.STRING, allowNull: false },
    order_id: { type: DataTypes.STRING, allowNull: false },
    idempotency_key: { type: DataTypes.STRING, allowNull: false, unique: true },
    erp_sale_id: { type: DataTypes.STRING, allowNull: true },
    erp_sale_codigo: { type: DataTypes.STRING, allowNull: true },
    cliente_id: { type: DataTypes.STRING, allowNull: true },
    loja_id: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize,
    tableName: 'erp_sale_links',
    underscored: true,
    indexes: [
      { fields: ['merchant_id', 'order_id'], unique: true },
      { fields: ['idempotency_key'], unique: true },
    ],
  }
);
