import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

interface OrderAttributes {
  id: string;
  display_id?: string;
  merchant_id: string;

  // cliente
  customer_id?: string;
  customer_name?: string;
  customer_document?: string;
  customer_phone?: string;
  customer_orders_on_merchant?: number | null;

  // pedido
  is_test?: boolean;
  order_type: string;
  order_timing?: string;
  sales_channel?: string | null;

  // preparo/entrega
  preparation_start_datetime?: Date | null;
  delivery_mode?: string;
  delivery_description?: string;
  delivered_by?: string;
  delivery_datetime?: Date | null;   // aceita null
  delivery_observations?: string | null;
  delivery_address?: object | null;  // aceita null
  delivery_city?: string | null;
  delivery_state?: string | null;
  pickup_code?: string | null;

  // valores
  subtotal: number;
  delivery_fee: number;
  additional_fees?: number | null;
  order_amount: number;
  prepaid_amount?: number | null;
  pending_amount?: number | null;

  created_at?: Date;
  updated_at?: Date;
}

type OrderCreationAttributes =
  Optional<OrderAttributes, 'id' | 'created_at' | 'updated_at'>;

export class Order
  extends Model<OrderAttributes, OrderCreationAttributes>
  implements OrderAttributes
{
  public id!: string;
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
    id: { type: DataTypes.STRING, primaryKey: true },
    display_id: { type: DataTypes.STRING },

    merchant_id: { type: DataTypes.STRING, allowNull: false },

    // cliente
    customer_id: { type: DataTypes.STRING, allowNull: true },
    customer_name: { type: DataTypes.STRING, allowNull: true },
    customer_document: { type: DataTypes.STRING, allowNull: true },
    customer_phone: { type: DataTypes.STRING, allowNull: true },
    customer_orders_on_merchant: { type: DataTypes.INTEGER, allowNull: true },

    // pedido
    is_test: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    order_type: { type: DataTypes.STRING, allowNull: false },
    order_timing: { type: DataTypes.STRING, allowNull: true },
    sales_channel: { type: DataTypes.STRING, allowNull: true },

    // preparo/entrega
    preparation_start_datetime: { type: DataTypes.DATE, allowNull: true },
    delivery_mode: { type: DataTypes.STRING, allowNull: true },
    delivery_description: { type: DataTypes.STRING, allowNull: true },
    delivered_by: { type: DataTypes.STRING, allowNull: true },
    delivery_datetime: { type: DataTypes.DATE, allowNull: true },
    delivery_observations: { type: DataTypes.TEXT, allowNull: true },
    delivery_address: { type: DataTypes.JSON, allowNull: true },
    delivery_city: { type: DataTypes.STRING, allowNull: true },
    delivery_state: { type: DataTypes.STRING, allowNull: true },
    pickup_code: { type: DataTypes.STRING, allowNull: true },

    // valores
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
  }
);
