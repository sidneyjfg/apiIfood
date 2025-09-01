// models/products.ts
import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

interface ProductAttributes {
  id: string;
  merchant_id: string;
  external_code: string;
  product_id?: string | null;
  ean?: string | null;
  name?: string | null;
  description?: string | null;
  image_path?: string | null;
  price?: number | null;
  status?: string | null;
  on_hand: number;
  created_at?: Date;
  updated_at?: Date;
}

type ProductCreationAttributes = Optional<ProductAttributes, 'id' | 'created_at' | 'updated_at'>;

export class Product extends Model<ProductAttributes, ProductCreationAttributes> implements ProductAttributes {
  public id!: string;
  public merchant_id!: string;
  public external_code!: string;
  public product_id?: string | null;
  public ean?: string | null;
  public name?: string | null;
  public description?: string | null;
  public image_path?: string | null;
  public price?: number | null;
  public status?: string | null;
  public on_hand!: number;
  public created_at?: Date;
  public updated_at?: Date;
}

Product.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },

    merchant_id: { type: DataTypes.STRING(45), allowNull: false },
    external_code: { type: DataTypes.STRING(45), allowNull: false },

    product_id: { type: DataTypes.STRING(45), allowNull: true },
    ean: { type: DataTypes.STRING(64), allowNull: true }, // pode ser >45, deixe 64

    name: { type: DataTypes.STRING(255), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    image_path: { type: DataTypes.STRING(255), allowNull: true },
    price: { type: DataTypes.FLOAT, allowNull: true },
    status: { type: DataTypes.STRING(32), allowNull: true },

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
    indexes: [
      { // UNIQUE (merchant_id, external_code)
        name: 'uq_prod_merchant_external',
        unique: true,
        fields: ['merchant_id', 'external_code'],
      },
      { // UNIQUE (merchant_id, product_id)
        name: 'uq_prod_merchant_productid',
        unique: true,
        fields: ['merchant_id', 'product_id'],
      },
      { // opcional: busca por EAN
        name: 'idx_prod_merchant_ean',
        unique: false,
        fields: ['merchant_id', 'ean'],
      },
    ],
  }
);
