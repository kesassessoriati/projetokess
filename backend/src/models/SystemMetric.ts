import {
    Table,
    Column,
    CreatedAt,
    UpdatedAt,
    Model,
    PrimaryKey,
    ForeignKey,
    BelongsTo,
    Default,
    DataType
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";

@Table({
    tableName: "SystemMetrics"
})
class SystemMetric extends Model<SystemMetric> {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id: string;

    @Column
    type: string; // 'PERFORMANCE' | 'PRODUCT_EVENT'

    @Column
    name: string; // 'API_RESPONSE_TIME' | 'TICKET_CREATED' | etc

    @Column(DataType.FLOAT)
    value: number;

    @Column(DataType.JSONB)
    metadata: any;

    @ForeignKey(() => Company)
    @Column
    companyId: number;

    @BelongsTo(() => Company)
    company: Company;

    @ForeignKey(() => User)
    @Column
    userId: number;

    @BelongsTo(() => User)
    user: User;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default SystemMetric;
