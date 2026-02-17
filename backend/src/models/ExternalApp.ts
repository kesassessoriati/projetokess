import {
    Table,
    Column,
    CreatedAt,
    UpdatedAt,
    Model,
    DataType,
    ForeignKey,
    BelongsTo
} from "sequelize-typescript";
import Company from "./Company";

@Table
class ExternalApp extends Model<ExternalApp> {
    @Column
    name: string;

    @Column(DataType.TEXT)
    url: string;

    @Column({ defaultValue: "Language" })
    icon: string;

    @Column({ defaultValue: true })
    isActive: boolean;

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

export default ExternalApp;
