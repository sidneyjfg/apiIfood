import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database';
import { Optional } from 'sequelize';

type ProductCreationAttributes = Optional<ProductAttributes, 'id' | 'created_at' | 'updated_at' | 'synced_at'>;

interface ProductAttributes {
  id: number;
  external_code: string;
  product_id: string;
  name: string;
  description?: string;
  image_path?: string;
  ean?: string;
  price?: number;
  selling_option_minimum?: number;
  selling_option_incremental?: number;
  status: string;
  quantity?: number;
  reserved_quantity?: number;
  merchant_id?: string;
  synced_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export class Product extends Model<ProductAttributes, ProductCreationAttributes> implements ProductAttributes {
  public id!: number;
  public external_code!: string;
  public product_id!: string;
  public name!: string;
  public description?: string;
  public image_path?: string;
  public ean?: string;
  public price?: number;
  public selling_option_minimum?: number;
  public selling_option_incremental?: number;
  public status!: string;
  public quantity?: number;
  public reserved_quantity?: number;
  public merchant_id?: string;
  public synced_at?: Date;
  public created_at?: Date;
  public updated_at?: Date;
}

Product.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    external_code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    product_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    image_path: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ean: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    selling_option_minimum: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    selling_option_incremental: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'AVAILABLE',
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    reserved_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    merchant_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    synced_at: {
      type: DataTypes.DATE,
      allowNull: true,
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
    modelName: 'Product',
    tableName: 'products',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);
