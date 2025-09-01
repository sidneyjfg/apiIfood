import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

export type ReservationState = 'ACTIVE' | 'CANCELLED' | 'CONSUMED';

interface InventoryReservationAttributes {
  id: string;
  product_id: string;
  channel: string;       // 'IFOOD' | 'PDV' | ...
  order_id?: string | null;
  item_key?: string | null;
  qty: number;
  state: ReservationState;
  created_at?: Date;
  updated_at?: Date;
}

type InventoryReservationCreation = Optional<
  InventoryReservationAttributes,
  'id' | 'order_id' | 'item_key' | 'state' | 'created_at' | 'updated_at'
>;

export class InventoryReservation
  extends Model<InventoryReservationAttributes, InventoryReservationCreation>
  implements InventoryReservationAttributes
{
  public id!: string;
  public product_id!: string;
  public channel!: string;
  public order_id!: string | null;
  public item_key!: string | null;
  public qty!: number;
  public state!: ReservationState;
  public created_at?: Date;
  public updated_at?: Date;
}

InventoryReservation.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    product_id: { type: DataTypes.STRING, allowNull: false },
    channel: { type: DataTypes.STRING, allowNull: false },
    order_id: { type: DataTypes.STRING, allowNull: true },
    item_key: { type: DataTypes.STRING, allowNull: true },
    qty: { type: DataTypes.INTEGER, allowNull: false },
    state: { type: DataTypes.STRING, allowNull: false, defaultValue: 'ACTIVE' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'InventoryReservation',
    tableName: 'inventory_reservations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { name: 'idx_res_product', fields: ['product_id'] },
      { name: 'uq_res_channel_order_item', fields: ['channel', 'order_id', 'item_key'], unique: true },
    ],
  }
);
