import {
    Table,
    Column,
    CreatedAt,
    UpdatedAt,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    ForeignKey,
    BelongsTo
} from "sequelize-typescript";
import Whatsapp from "./Whatsapp";
import Company from "./Company";
import WhatsappWarmup from "./WhatsappWarmup";

@Table
class WhatsappWarmupLog extends Model<WhatsappWarmupLog> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => Whatsapp)
    @Column
    whatsappId: number;

    @BelongsTo(() => Whatsapp)
    whatsapp: Whatsapp;

    @ForeignKey(() => Company)
    @Column
    companyId: number;

    @BelongsTo(() => Company)
    company: Company;

    @ForeignKey(() => WhatsappWarmup)
    @Column
    warmupId: number;

    @BelongsTo(() => WhatsappWarmup)
    warmup: WhatsappWarmup;

    @Column(DataType.STRING)
    type: string;

    @Column(DataType.STRING)
    message: string;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default WhatsappWarmupLog;
