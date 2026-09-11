import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  DataType,
  Default,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";

@Table({ tableName: "MetaMarketingConnections" })
class MetaMarketingConnection extends Model<MetaMarketingConnection> {
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
  authorizedByUserId: number;

  @BelongsTo(() => User, { foreignKey: "authorizedByUserId" })
  authorizedByUser: User;

  @Column({ type: DataType.STRING(128), allowNull: false })
  metaUserIdHash: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  accessTokenCiphertext: string;

  @Default("v1")
  @Column({ type: DataType.STRING(32), allowNull: false })
  keyVersion: string;

  @Column({ type: DataType.DATE, allowNull: true })
  tokenExpiresAt: Date;

  @Default("connected")
  @Column({ type: DataType.STRING(32), allowNull: false })
  status: string;

  @Default([])
  @Column({ type: DataType.JSONB, allowNull: false })
  scopes: string[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default MetaMarketingConnection;
