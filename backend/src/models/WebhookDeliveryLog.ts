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
import SystemWebhook from "./SystemWebhook";

@Table({
    tableName: "WebhookDeliveryLogs"
})
class WebhookDeliveryLog extends Model<WebhookDeliveryLog> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => SystemWebhook)
    @Column
    webhookId: number;

    @BelongsTo(() => SystemWebhook)
    webhook: SystemWebhook;

    @Column
    eventId: string;

    @Column(DataType.ENUM("SUCCESS", "FAILED"))
    status: string;

    @Column
    responseCode: number;

    @Column(DataType.TEXT)
    responseBody: string;

    @Column
    attempt: number;

    @Column
    executionTime: number;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default WebhookDeliveryLog;
