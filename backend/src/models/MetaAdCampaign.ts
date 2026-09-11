import {
  Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey, AutoIncrement,
  DataType, Default, ForeignKey, BelongsTo
} from "sequelize-typescript";
import Company from "./Company";
import CrmClient from "./CrmClient";
import MetaAdAccount from "./MetaAdAccount";

@Table({ tableName: "MetaAdCampaigns" })
class MetaAdCampaign extends Model<MetaAdCampaign> {
  @PrimaryKey @AutoIncrement @Column id: number;
  @ForeignKey(() => Company) @Column({ allowNull: false }) companyId: number;
  @BelongsTo(() => Company) company: Company;
  @ForeignKey(() => MetaAdAccount) @Column({ allowNull: false }) adAccountId: number;
  @BelongsTo(() => MetaAdAccount) adAccount: MetaAdAccount;
  @ForeignKey(() => CrmClient) @Column({ allowNull: true }) crmClientId: number;
  @BelongsTo(() => CrmClient) crmClient: CrmClient;
  @Column({ type: DataType.STRING(64), allowNull: false }) externalCampaignId: string;
  @Column({ type: DataType.STRING(255), allowNull: false }) name: string;
  @Default("active") @Column({ type: DataType.STRING(32), allowNull: false }) status: string;
  @CreatedAt createdAt: Date;
  @UpdatedAt updatedAt: Date;
}

export default MetaAdCampaign;
