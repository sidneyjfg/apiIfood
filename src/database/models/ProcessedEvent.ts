import { Model, DataTypes } from 'sequelize';
import { sequelize } from '@config/database';

export class ProcessedEvent extends Model {
    declare id: number;
    declare merchant_id: string;
    declare event_id: string;
    declare event_type?: string;
    declare payload_hash?: string;
}
ProcessedEvent.init({
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    merchant_id: { type: DataTypes.STRING(64), allowNull: false },
    event_id: { type: DataTypes.STRING(128), allowNull: false },
    event_type: { type: DataTypes.STRING(64) },
    payload_hash: { type: DataTypes.STRING(64) },
}, {
    sequelize, tableName: 'processed_events', underscored: true, timestamps: false,
});
