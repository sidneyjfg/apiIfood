// src/database/models/products.ts
import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

interface ProductAttributes {
  id: number;                         // INT AUTO_INCREMENT no MySQL atual
  merchant_id: string;
  external_code: string;
  product_id: string;                 // NOT NULL na tabela
  ean?: string | null;
  name: string;                       // NOT NULL na tabela
  description?: string | null;
  image_path?: string | null;
  price?: number | null;
  status: string;                     // default 'AVAILABLE'
  on_hand: number;
  created_at?: Date;
  updated_at?: Date;
}

type ProductCreationAttributes = Optional<
  ProductAttributes,
  'id' | 'ean' | 'description' | 'image_path' | 'price' | 'status' | 'created_at' | 'updated_at'
>;

export class Product
  extends Model<ProductAttributes, ProductCreationAttributes>
  implements ProductAttributes
{
  public id!: number;
  public merchant_id!: string;
  public external_code!: string;
  public product_id!: string;
  public ean?: string | null;
  public name!: string;
  public description?: string | null;
  public image_path?: string | null;
  public price?: number | null;
  public status!: string;
  public on_hand!: number;
  public created_at?: Date;
  public updated_at?: Date;
}

Product.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    merchant_id: { type: DataTypes.STRING(255), allowNull: false },
    external_code: { type: DataTypes.STRING(255), allowNull: false },

    product_id: { type: DataTypes.STRING(255), allowNull: false },
    ean: { type: DataTypes.STRING(255), allowNull: true },

    name: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    image_path: { type: DataTypes.STRING(255), allowNull: true },
    price: { type: DataTypes.FLOAT, allowNull: true },

    status: { type: DataTypes.STRING(255), allowNull: false, defaultValue: 'AVAILABLE' },

    on_hand: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'Product',
    tableName: 'products',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',

    // Estes índices documentam a intenção e ajudam se você criar a tabela do zero via sync/migrations.
    indexes: [
      {
        name: 'uq_prod_merchant_external',
        unique: true,
        fields: ['merchant_id', 'external_code'],
      },
      {
        name: 'uq_prod_merchant_productid',
        unique: true,
        fields: ['merchant_id', 'product_id'],
      },
      {
        name: 'idx_prod_merchant_ean',
        unique: false,
        fields: ['merchant_id', 'ean'],
      },
    ],
  }
);
