import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

interface OrderAttributes {
  id: string;
  display_id?: string;
  merchant_id: string;
  customer_id?: string;
  customer_name?: string;
  customer_document?: string;
  customer_phone?: string;
  is_test?: boolean;
  order_type: string;
  order_timing?: string;
  delivery_mode?: string;
  delivery_description?: string;
  delivered_by?: string;
  delivery_datetime?: Date;
  delivery_observations?: string;
  delivery_address?: object;
  pickup_code?: string;
  subtotal: number;
  delivery_fee: number;
  additional_fees?: number;
  order_amount: number;
  prepaid_amount?: number;
  pending_amount?: number;
  created_at?: Date;
  updated_at?: Date;
}

type OrderCreationAttributes = Optional<OrderAttributes, 'id' | 'created_at' | 'updated_at'>;

export class Order extends Model<OrderAttributes, OrderCreationAttributes> implements OrderAttributes {
  public id!: string;
  public display_id?: string;
  public merchant_id!: string;
  public customer_id?: string;
  public customer_name?: string;
  public customer_document?: string;
  public customer_phone?: string;
  public is_test?: boolean;
  public order_type!: string;
  public order_timing?: string;
  public delivery_mode?: string;
  public delivery_description?: string;
  public delivered_by?: string;
  public delivery_datetime?: Date;
  public delivery_observations?: string;
  public delivery_address?: object;
  public pickup_code?: string;
  public subtotal!: number;
  public delivery_fee!: number;
  public additional_fees?: number;
  public order_amount!: number;
  public prepaid_amount?: number;
  public pending_amount?: number;
  public created_at?: Date;
  public updated_at?: Date;
}

Order.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    display_id: {
      type: DataTypes.STRING,
    },
    merchant_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    customer_id: {
      type: DataTypes.STRING,
    },
    customer_name: {
      type: DataTypes.STRING,
    },
    customer_document: {
      type: DataTypes.STRING,
    },
    customer_phone: {
      type: DataTypes.STRING,
    },
    is_test: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    order_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    order_timing: {
      type: DataTypes.STRING,
    },
    delivery_mode: {
      type: DataTypes.STRING,
    },
    delivery_description: {
      type: DataTypes.STRING,
    },
    delivered_by: {
      type: DataTypes.STRING,
    },
    delivery_datetime: {
      type: DataTypes.DATE,
    },
    delivery_observations: {
      type: DataTypes.TEXT,
    },
    delivery_address: {
      type: DataTypes.JSON,
    },
    pickup_code: {
      type: DataTypes.STRING,
    },
    subtotal: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    delivery_fee: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    additional_fees: {
      type: DataTypes.FLOAT,
    },
    order_amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    prepaid_amount: {
      type: DataTypes.FLOAT,
    },
    pending_amount: {
      type: DataTypes.FLOAT,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
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
