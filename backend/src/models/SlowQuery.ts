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
    tableName: "SlowQueries"
})
class SlowQuery extends Model<SlowQuery> {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id: string;

    @Column(DataType.TEXT)
    query: string;

    @Column(DataType.FLOAT)
    duration: number;

    @Column
    severity: string; // 'HIGH', 'CRITICAL', 'LOW'

    @Column
    route: string;

    @ForeignKey(() => Company)
    @Column
    companyId: number;

    @BelongsTo(() => Company)
    company: Company;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default SlowQuery;
