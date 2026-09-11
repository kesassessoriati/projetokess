import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  DataType,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import Company from "./Company";

@Table({ tableName: "MetaMarketingDataDeletionRequests" })
class MetaMarketingDataDeletionRequest extends Model<MetaMarketingDataDeletionRequest> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column({ allowNull: true })
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Column({ type: DataType.STRING(128), allowNull: false })
  metaUserIdHash: string;

  @Column({ type: DataType.STRING(128), allowNull: false })
  confirmationCodeHash: string;

  @Column({ type: DataType.STRING(32), allowNull: false, defaultValue: "completed" })
  status: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default MetaMarketingDataDeletionRequest;
