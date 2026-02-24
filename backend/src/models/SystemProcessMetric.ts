import {
    Table,
    Column,
    CreatedAt,
    UpdatedAt,
    Model,
    PrimaryKey,
    Default,
    DataType,
} from "sequelize-typescript";

@Table({
    tableName: "SystemProcessMetrics"
})
class SystemProcessMetric extends Model<SystemProcessMetric> {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id: string;

    @Column(DataType.BIGINT)
    cpuUser: number;

    @Column(DataType.BIGINT)
    cpuSystem: number;

    @Column(DataType.BIGINT)
    memoryRss: number;

    @Column(DataType.BIGINT)
    memoryHeapUsed: number;

    @Column(DataType.BIGINT)
    memoryHeapTotal: number;

    @Column(DataType.FLOAT)
    eventLoopDelay: number;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default SystemProcessMetric;
