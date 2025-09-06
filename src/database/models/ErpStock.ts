// models/erp_stock.ts
import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

export interface ErpStockAttrs {
    id: number;
    erp_location_id: number;   // FK -> erp_locations.id
    external_code: string;     // SKU do ERP (use products.external_code)
    on_hand: number;
    updated_at?: Date;         // só rastreamos updated_at (como no DDL)
}

export type ErpStockCreationAttrs = Optional<ErpStockAttrs, 'id' | 'on_hand' | 'updated_at'>;

export class ErpStock extends Model<ErpStockAttrs, ErpStockCreationAttrs> implements ErpStockAttrs {
    public id!: number;
    public erp_location_id!: number;
    public external_code!: string;
    public on_hand!: number;
    public readonly updated_at!: Date;

    // util: incremento/decremento seguro
    public static async adjustOnHand(erp_location_id: number, external_code: string, delta: number) {
        const [row] = await ErpStock.findOrCreate({
            where: { erp_location_id, external_code },
            defaults: { erp_location_id, external_code, on_hand: 0 },
        });
        // regra: não deixar negativo (opcional; remova se quiser permitir)
        const next = row.on_hand + delta;
        if (next < 0) {
            console.warn(`⚠️ Estoque negativo bloqueado (loc=${erp_location_id}, sku=${external_code}, atual=${row.on_hand}, delta=${delta})`);
            // você pode lançar erro aqui, se preferir
            return row;
        }
        await row.update({ on_hand: next });
        return row;
    }
}

ErpStock.init({
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

    erp_location_id: { type: DataTypes.INTEGER, allowNull: false },

    external_code: {
        type: DataTypes.STRING(255),
        allowNull: false,
        set(v: string) { this.setDataValue('external_code', v.trim()); },
        validate: { len: { args: [1, 255], msg: 'external_code inválido' } },
    },

    on_hand: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
    sequelize,
    modelName: 'ErpStock',
    tableName: 'erp_stock',
    timestamps: false,   // só updated_at
    underscored: true,
    indexes: [
        { name: 'uq_erp_stock_loc_sku', unique: true, fields: ['erp_location_id', 'external_code'] },
        { name: 'idx_erp_stock_sku', fields: ['external_code'] },
    ],
});
