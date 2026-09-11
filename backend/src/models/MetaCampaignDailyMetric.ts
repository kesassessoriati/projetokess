import {
  Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey, AutoIncrement,
  DataType, ForeignKey, BelongsTo
} from "sequelize-typescript";
import Company from "./Company";
import MetaAdAccount from "./MetaAdAccount";
import MetaAdCampaign from "./MetaAdCampaign";

@Table({ tableName: "MetaCampaignDailyMetrics" })
class MetaCampaignDailyMetric extends Model<MetaCampaignDailyMetric> {
  @PrimaryKey @AutoIncrement @Column id: number;
  @ForeignKey(() => Company) @Column({ allowNull: false }) companyId: number;
  @BelongsTo(() => Company) company: Company;
  @ForeignKey(() => MetaAdAccount) @Column({ allowNull: false }) adAccountId: number;
  @BelongsTo(() => MetaAdAccount) adAccount: MetaAdAccount;
  @ForeignKey(() => MetaAdCampaign) @Column({ allowNull: false }) campaignId: number;
  @BelongsTo(() => MetaAdCampaign) campaign: MetaAdCampaign;
  @Column({ type: DataType.DATEONLY, allowNull: false }) statDate: string;
  @Column({ type: DataType.DECIMAL(18, 6), allowNull: false, defaultValue: 0 }) spend: string;
  @Column({ type: DataType.DECIMAL(18, 6), allowNull: false, defaultValue: 0 }) ctr: string;
  @Column({ type: DataType.DECIMAL(18, 6), allowNull: false, defaultValue: 0 }) cpc: string;
  @Column({ type: DataType.DECIMAL(18, 6), allowNull: false, defaultValue: 0 }) cpm: string;
  @Column({ type: DataType.DECIMAL(18, 6), allowNull: false, defaultValue: 0 }) resultValue: string;
  @Column({ type: DataType.BIGINT, allowNull: false, defaultValue: 0 }) impressions: string;
  @Column({ type: DataType.BIGINT, allowNull: false, defaultValue: 0 }) reach: string;
  @Column({ type: DataType.BIGINT, allowNull: false, defaultValue: 0 }) clicks: string;
  @Column({ type: DataType.STRING(128), allowNull: true }) resultActionType: string;
  @Column({ type: DataType.STRING(8), allowNull: false }) currency: string;
  @Column({ type: DataType.STRING(64), allowNull: false }) timezone: string;
  @Column({ type: DataType.STRING(128), allowNull: false }) attributionWindow: string;
  @Column({ type: DataType.STRING(32), allowNull: false }) apiVersion: string;
  @Column({ type: DataType.DATE, allowNull: false }) collectedAt: Date;
  @CreatedAt createdAt: Date;
  @UpdatedAt updatedAt: Date;
}

export default MetaCampaignDailyMetric;
