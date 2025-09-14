// src/database/models/ProcessedEvent.ts
import { Model, DataTypes, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '@config/database';

export class ProcessedEvent extends Model<
  InferAttributes<ProcessedEvent>,
  InferCreationAttributes<ProcessedEvent>
> {
  declare id: CreationOptional<number>;
  declare merchant_id: string;
  declare event_id: string;
  declare event_type: string | null;
  declare payload_hash: string | null;
  declare created_at: CreationOptional<Date>;
}

ProcessedEvent.init({
  id:           { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  merchant_id:  { type: DataTypes.STRING(64),  allowNull: false },
  event_id:     { type: DataTypes.STRING(128), allowNull: false },
  event_type:   { type: DataTypes.STRING(64),  allowNull: true },
  payload_hash: { type: DataTypes.STRING(64),  allowNull: true },
  created_at:   { type: DataTypes.DATE,        allowNull: false, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  tableName: 'processed_events',
  underscored: true,
  timestamps: false,
  indexes: [
    { name: 'idx_processed_events_merchant', fields: ['merchant_id'] },
    { name: 'uniq_processed_events_merchant_event', unique: true, fields: ['merchant_id', 'event_id'] },
  ],
});
