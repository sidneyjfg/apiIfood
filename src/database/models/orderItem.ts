import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

interface OrderItemAttributes {
  id: string;
  order_id: string;
  index?: number;
  item_id: string;
  unique_id?: string;
  name: string;
  external_code?: string;
  type?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  options_price?: number;
  total_price: number;
  price: number;
  observations?: string;
  image_url?: string;
  options?: object;
  created_at?: Date;
  updated_at?: Date;
}

type OrderItemCreationAttributes = Optional<OrderItemAttributes, 'id' | 'created_at' | 'updated_at'>;

export class OrderItem extends Model<OrderItemAttributes, OrderItemCreationAttributes> implements OrderItemAttributes {
  public id!: string;
  public order_id!: string;
  public index?: number;
  public item_id!: string;
  public unique_id?: string;
  public name!: string;
  public external_code?: string;
  public type?: string;
  public quantity!: number;
  public unit!: string;
  public unit_price!: number;
  public options_price?: number;
  public total_price!: number;
  public price!: number;
  public observations?: string;
  public image_url?: string;
  public options?: object;
  public created_at?: Date;
  public updated_at?: Date;
}

OrderItem.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    order_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    index: {
      type: DataTypes.INTEGER,
    },
    item_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    unique_id: {
      type: DataTypes.STRING,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    external_code: {
      type: DataTypes.STRING,
    },
    type: {
      type: DataTypes.STRING,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    unit_price: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    options_price: {
      type: DataTypes.FLOAT,
    },
    total_price: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    observations: {
      type: DataTypes.TEXT,
    },
    image_url: {
      type: DataTypes.STRING,
    },
    options: {
      type: DataTypes.JSON,
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
    modelName: 'OrderItem',
    tableName: 'order_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);
