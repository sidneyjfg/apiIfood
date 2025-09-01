import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

interface OrderAttributes {
  id: string;
  order_id?: string | null;                 // <-- alias gerado de id
  display_id?: string;
  merchant_id: string;

  customer_id?: string;
  customer_name?: string;
  customer_document?: string;
  customer_phone?: string;
  customer_orders_on_merchant?: number | null;

  is_test?: boolean;
  order_type: string;
  order_timing?: string;
  sales_channel?: string | null;

  // NOVOS CAMPOS DE STATUS
  status?: string | null;                   // <-- novo
  last_event_code?: string | null;          // <-- novo
  last_event_at?: Date | null;              // <-- novo

  preparation_start_datetime?: Date | null;
  delivery_mode?: string;
  delivery_description?: string;
  delivered_by?: string;
  delivery_datetime?: Date | null;
  delivery_observations?: string | null;
  delivery_address?: object | null;
  delivery_city?: string | null;
  delivery_state?: string | null;
  pickup_code?: string | null;

  subtotal: number;
  delivery_fee: number;
  additional_fees?: number | null;
  order_amount: number;
  prepaid_amount?: number | null;
  pending_amount?: number | null;

  created_at?: Date;
  updated_at?: Date;
}

type OrderCreationAttributes = Optional<OrderAttributes,
  'id' | 'order_id' | 'status' | 'last_event_code' | 'last_event_at' | 'created_at' | 'updated_at'
>;

export class Order
  extends Model<OrderAttributes, OrderCreationAttributes>
  implements OrderAttributes
{
  public id!: string;
  public order_id?: string | null;          // gerado (read-only)
  public display_id?: string;
  public merchant_id!: string;

  public customer_id?: string;
  public customer_name?: string;
  public customer_document?: string;
  public customer_phone?: string;
  public customer_orders_on_merchant?: number | null;

  public is_test?: boolean;
  public order_type!: string;
  public order_timing?: string;
  public sales_channel?: string | null;

  public status?: string | null;            // novo
  public last_event_code?: string | null;   // novo
  public last_event_at?: Date | null;       // novo

  public preparation_start_datetime?: Date | null;
  public delivery_mode?: string;
  public delivery_description?: string;
  public delivered_by?: string;
  public delivery_datetime?: Date | null;
  public delivery_observations?: string | null;
  public delivery_address?: object | null;
  public delivery_city?: string | null;
  public delivery_state?: string | null;
  public pickup_code?: string | null;

  public subtotal!: number;
  public delivery_fee!: number;
  public additional_fees?: number | null;
  public order_amount!: number;
  public prepaid_amount?: number | null;
  public pending_amount?: number | null;

  public created_at?: Date;
  public updated_at?: Date;
}

Order.init(
  {
    id: { type: DataTypes.STRING(45), primaryKey: true },

    // coluna gerada no MySQL; não atribua valor a ela no código
    order_id: { type: DataTypes.STRING(45), allowNull: true },

    display_id: { type: DataTypes.STRING(45), allowNull: true },
    merchant_id: { type: DataTypes.STRING(45), allowNull: false },

    customer_id: { type: DataTypes.STRING(45), allowNull: true },
    customer_name: { type: DataTypes.STRING(255), allowNull: true },
    customer_document: { type: DataTypes.STRING(32), allowNull: true },
    customer_phone: { type: DataTypes.STRING(32), allowNull: true },
    customer_orders_on_merchant: { type: DataTypes.INTEGER, allowNull: true },

    is_test: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    order_type: { type: DataTypes.STRING(32), allowNull: false },
    order_timing: { type: DataTypes.STRING(32), allowNull: true },
    sales_channel: { type: DataTypes.STRING(32), allowNull: true },

    // novos campos
    status: { type: DataTypes.STRING(32), allowNull: true },
    last_event_code: { type: DataTypes.STRING(16), allowNull: true },
    last_event_at: { type: DataTypes.DATE, allowNull: true },

    preparation_start_datetime: { type: DataTypes.DATE, allowNull: true },
    delivery_mode: { type: DataTypes.STRING(32), allowNull: true },
    delivery_description: { type: DataTypes.STRING(255), allowNull: true },
    delivered_by: { type: DataTypes.STRING(64), allowNull: true },
    delivery_datetime: { type: DataTypes.DATE, allowNull: true },
    delivery_observations: { type: DataTypes.TEXT, allowNull: true },
    delivery_address: { type: DataTypes.JSON, allowNull: true },
    delivery_city: { type: DataTypes.STRING(128), allowNull: true },
    delivery_state: { type: DataTypes.STRING(64), allowNull: true },
    pickup_code: { type: DataTypes.STRING(32), allowNull: true },

    subtotal: { type: DataTypes.FLOAT, allowNull: false },
    delivery_fee: { type: DataTypes.FLOAT, allowNull: false },
    additional_fees: { type: DataTypes.FLOAT, allowNull: true },
    order_amount: { type: DataTypes.FLOAT, allowNull: false },
    prepaid_amount: { type: DataTypes.FLOAT, allowNull: true },
    pending_amount: { type: DataTypes.FLOAT, allowNull: true },

    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'Order',
    tableName: 'orders',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { name: 'idx_orders_merchant', fields: ['merchant_id'] },
      { name: 'idx_orders_merchant_status', fields: ['merchant_id', 'status'] }, // combina com a migration
    ],
  }
);