import {
    Table,
    Column,
    CreatedAt,
    UpdatedAt,
    Model,
    DataType,
    PrimaryKey,
    Default,
    ForeignKey,
    BelongsTo
} from "sequelize-typescript";
import User from "./User";
import Company from "./Company";

@Table({
    tableName: "FrontendErrors"
})
class FrontendError extends Model<FrontendError> {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id: string;

    @Column(DataType.TEXT)
    message: string;

    @Column(DataType.TEXT)
    stack: string;

    @Column(DataType.TEXT)
    componentStack: string;

    @Column
    url: string;

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

    @Column
    userAgent: string;

    @Default("MEDIUM")
    @Column(DataType.ENUM("LOW", "MEDIUM", "HIGH"))
    severity: "LOW" | "MEDIUM" | "HIGH";

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

export default FrontendError;
