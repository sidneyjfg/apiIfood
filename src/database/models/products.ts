// models/products.ts
import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

interface ProductAttributes {
  id: string;
  merchant_id: string;
  external_code: string;
  product_id?: string | null;
  ean?: string | null;
  name?: string | null;         // <-- adicionei
  description?: string | null;  // <-- adicionei
  image_path?: string | null;   // <-- adicionei
  price?: number | null;        // <-- adicionei
  status?: string | null;       // <-- adicionei
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
    merchant_id: { type: DataTypes.STRING, allowNull: false },
    external_code: { type: DataTypes.STRING, allowNull: false },
    product_id: { type: DataTypes.STRING },
    ean: { type: DataTypes.STRING },
    name: { type: DataTypes.STRING },        // <-- aqui também
    description: { type: DataTypes.TEXT },
    image_path: { type: DataTypes.STRING },
    price: { type: DataTypes.FLOAT },
    status: { type: DataTypes.STRING },
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
  }
);
