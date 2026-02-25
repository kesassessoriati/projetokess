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
    BelongsTo,
    Default,
    HasMany
} from "sequelize-typescript";
import Company from "./Company";
import WebhookDeliveryLog from "./WebhookDeliveryLog";

@Table({
    tableName: "SystemWebhooks"
})
class SystemWebhook extends Model<SystemWebhook> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => Company)
    @Column({ allowNull: true })
    companyId: number;

    @BelongsTo(() => Company)
    company: Company;

    @Column
    eventType: string;

    @Column(DataType.TEXT)
    url: string;

    @Column
    secret: string;

    @Default({ maxRetries: 3, backoff: "exponential" })
    @Column(DataType.JSONB)
    retryPolicy: any;

    @Default(true)
    @Column
    isActive: boolean;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;

    @HasMany(() => WebhookDeliveryLog)
    deliveryLogs: WebhookDeliveryLog[];
}

export default SystemWebhook;
