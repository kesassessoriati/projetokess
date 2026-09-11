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
import CrmClient from "./CrmClient";
import MetaMarketingConnection from "./MetaMarketingConnection";

@Table({ tableName: "MetaAdAccounts" })
class MetaAdAccount extends Model<MetaAdAccount> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column({ allowNull: false })
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => MetaMarketingConnection)
  @Column({ allowNull: false })
  connectionId: number;

  @BelongsTo(() => MetaMarketingConnection)
  connection: MetaMarketingConnection;

  @ForeignKey(() => CrmClient)
  @Column({ allowNull: true })
  crmClientId: number;

  @BelongsTo(() => CrmClient)
  crmClient: CrmClient;

  @Column({ type: DataType.STRING(64), allowNull: false })
  externalAccountId: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  name: string;

  @Column({ type: DataType.STRING(8), allowNull: false })
  currency: string;

  @Column({ type: DataType.STRING(64), allowNull: false })
  timezone: string;

  @Default([])
  @Column({ type: DataType.JSONB, allowNull: false })
  permissions: string[];

  @Default("active")
  @Column({ type: DataType.STRING(32), allowNull: false })
  status: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default MetaAdAccount;
