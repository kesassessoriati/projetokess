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
    AutoIncrement,
    AllowNull
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";

@Table({
    tableName: "BackendErrors"
})
class BackendError extends Model<BackendError> {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id: string;

    @Column(DataType.TEXT)
    message: string;

    @Column(DataType.TEXT)
    stack: string;

    @Column
    route: string;

    @Column
    method: string;

    @Column
    statusCode: number;

    @ForeignKey(() => User)
    @Column
    userId: number;

    @BelongsTo(() => User)
    user: User;

    @ForeignKey(() => Company)
    @Column
    companyId: number;

    @BelongsTo(() => Company)
    company: Company;

    @Default("MEDIUM")
    @Column(DataType.ENUM("LOW", "MEDIUM", "HIGH", "CRITICAL"))
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

    @Default(1)
    @Column
    occurrences: number;

    @Default("NEW")
    @Column(DataType.ENUM("NEW", "INVESTIGATING", "RESOLVED"))
    status: "NEW" | "INVESTIGATING" | "RESOLVED";

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default BackendError;
