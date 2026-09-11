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
import User from "./User";

@Table({ tableName: "MetaMarketingAuditLogs" })
class MetaMarketingAuditLog extends Model<MetaMarketingAuditLog> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column({ allowNull: false })
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => User)
  @Column({ allowNull: true })
  actorUserId: number;

  @BelongsTo(() => User, { foreignKey: "actorUserId" })
  actorUser: User;

  @Column({ type: DataType.STRING(96), allowNull: false })
  action: string;

  @Column({ type: DataType.STRING(96), allowNull: false })
  targetType: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  targetRef: string;

  @Column({ type: DataType.STRING(128), allowNull: false })
  payloadHash: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  metaRequestId: string;

  @Column({ type: DataType.STRING(32), allowNull: false })
  metaStatus: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default MetaMarketingAuditLog;
