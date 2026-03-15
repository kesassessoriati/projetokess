import {
    Table,
    Column,
    CreatedAt,
    UpdatedAt,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    Default,
    ForeignKey,
    BelongsTo,
    HasMany
} from "sequelize-typescript";
import Whatsapp from "./Whatsapp";
import Company from "./Company";
import WhatsappWarmupLog from "./WhatsappWarmupLog";
import Chip from "./Chip";

@Table
class WhatsappWarmup extends Model<WhatsappWarmup> {
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

    @ForeignKey(() => Chip)
    @Column
    chipId: number;

    @BelongsTo(() => Chip)
    chip: Chip;

    @Default(false)
    @Column
    isActive: boolean;

    @Default(50)
    @Column
    messagesPerDay: number;

    @Default(1)
    @Column
    minInterval: number;

    @Default(5)
    @Column
    maxInterval: number;

    @Default("09:00")
    @Column(DataType.STRING)
    startTime: string;

    @Default("21:00")
    @Column(DataType.STRING)
    endTime: string;

    @Default(10)
    @Column
    maxInteractionsPerHour: number;

    @Default("good")
    @Column(DataType.STRING)
    healthScore: string;

    @Default(0)
    @Column
    messagesSentToday: number;

    @Default(0)
    @Column
    simulatedMessages: number;

    @Default("0")
    @Column(DataType.STRING)
    avgResponseTime: string;

    // 'private' | 'groups' | 'cross' | 'combined'
    @Default("private")
    @Column(DataType.STRING(20))
    warmupMode: string;

    @Default(false)
    @Column
    useGroupsMode: boolean;

    @Default(false)
    @Column
    useCrossMode: boolean;

    @Column(DataType.JSON)
    scriptTemplates: string[];

    @Default(false)
    @Column
    dailyRampUp: boolean;

    @Default(1)
    @Column
    rampUpDay: number;

    @Default(5)
    @Column
    rampUpStartMessages: number;

    @Column(DataType.DATEONLY)
    lastResetDate: string;

    @HasMany(() => WhatsappWarmupLog)
    logs: WhatsappWarmupLog[];

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default WhatsappWarmup;
