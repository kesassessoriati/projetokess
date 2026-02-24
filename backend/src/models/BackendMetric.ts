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
    DataType,
} from "sequelize-typescript";
import Company from "./Company";

@Table({
    tableName: "BackendMetrics"
})
class BackendMetric extends Model<BackendMetric> {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id: string;

    @ForeignKey(() => Company)
    @Column
    companyId: number;

    @BelongsTo(() => Company)
    company: Company;

    @Column
    route: string;

    @Column
    method: string;

    @Column
    statusCode: number;

    @Column(DataType.FLOAT)
    durationMs: number;

    @Column
    requestId: string;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default BackendMetric;
