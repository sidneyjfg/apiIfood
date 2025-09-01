// models/order_items.ts
import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

type OrderItemState = 'NEW' | 'RESERVED' | 'CONCLUDED' | 'CANCELLED';

interface OrderItemAttributes {
  id: string;
  merchant_id: string;
  order_id: string;
  index?: number;
  item_id: string;
  unique_id?: string;
  name: string;
  external_code?: string;
  ean?: string;
  type?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  options_price?: number;
  total_price: number;
  price: number;
  observations?: string;
  image_url?: string;
  options?: object | null;

  state?: OrderItemState;
  reserved_qty?: number;
  concluded_qty?: number;
  cancelled_qty?: number;
  last_event_code?: string;
  last_event_at?: Date;

  created_at?: Date;
  updated_at?: Date;
}

type OrderItemCreationAttributes = Optional<
  OrderItemAttributes,
  | 'id'
  | 'index'
  | 'unique_id'
  | 'external_code'
  | 'ean'
  | 'type'
  | 'options_price'
  | 'observations'
  | 'image_url'
  | 'options'
  | 'state'
  | 'reserved_qty'
  | 'concluded_qty'
  | 'cancelled_qty'
  | 'last_event_code'
  | 'last_event_at'
  | 'created_at'
  | 'updated_at'
>;

export class OrderItem
  extends Model<OrderItemAttributes, OrderItemCreationAttributes>
  implements OrderItemAttributes
{
  public id!: string;
  public merchant_id!: string;
  public order_id!: string;
  public index?: number;
  public item_id!: string;
  public unique_id?: string;
  public name!: string;
  public external_code?: string;
  public ean?: string;
  public type?: string;
  public quantity!: number;
  public unit!: string;
  public unit_price!: number;
  public options_price?: number;
  public total_price!: number;
  public price!: number;
  public observations?: string;
  public image_url?: string;
  public options?: object | null;

  public state?: OrderItemState;
  public reserved_qty?: number;
  public concluded_qty?: number;
  public cancelled_qty?: number;
  public last_event_code?: string;
  public last_event_at?: Date;

  public created_at?: Date;
  public updated_at?: Date;
}

OrderItem.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },

    merchant_id: { type: DataTypes.STRING(45), allowNull: false },
    order_id: { type: DataTypes.STRING(45), allowNull: false },

    index: { type: DataTypes.INTEGER, allowNull: true },
    item_id: { type: DataTypes.STRING(45), allowNull: false },
    unique_id: { type: DataTypes.STRING(45), allowNull: true },

    name: { type: DataTypes.STRING(255), allowNull: false },

    external_code: { type: DataTypes.STRING(45), allowNull: true },
    ean: { type: DataTypes.STRING(64), allowNull: true },

    type: { type: DataTypes.STRING(64), allowNull: true },

    quantity: { type: DataTypes.INTEGER, allowNull: false },
    unit: { type: DataTypes.STRING(16), allowNull: false },
    unit_price: { type: DataTypes.FLOAT, allowNull: false },
    options_price: { type: DataTypes.FLOAT, allowNull: true },
    total_price: { type: DataTypes.FLOAT, allowNull: false },
    price: { type: DataTypes.FLOAT, allowNull: false },

    observations: { type: DataTypes.TEXT, allowNull: true },
    image_url: { type: DataTypes.STRING(255), allowNull: true },
    options: { type: DataTypes.JSON, allowNull: true },

    state: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'NEW' },
    reserved_qty: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    concluded_qty: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    cancelled_qty: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    last_event_code: { type: DataTypes.STRING(16), allowNull: true },
    last_event_at: { type: DataTypes.DATE, allowNull: true },

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'OrderItem',
    tableName: 'order_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      // NOVO: UNIQUE por loja + pedido + external_code
      {
        name: 'uq_order_items_merchant_order_external',
        unique: true,
        fields: ['merchant_id', 'order_id', 'external_code'],
      },
      // manter índice por EAN
      { name: 'idx_order_items_ean', unique: false, fields: ['ean'] },
    ],
  }
);
