import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  BelongsTo,
  ForeignKey
} from "sequelize-typescript";
import Company from "./Company";
import ButtonCampaign from "./ButtonCampaign";

@Table({ tableName: "ButtonCampaignShippings" })
class ButtonCampaignShipping extends Model<ButtonCampaignShipping> {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ForeignKey(() => Company)
  @Column({ type: DataType.INTEGER, allowNull: false })
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => ButtonCampaign)
  @Column({ type: DataType.INTEGER, allowNull: false })
  campaignId: number;

  @BelongsTo(() => ButtonCampaign)
  campaign: ButtonCampaign;

  @Column({ type: DataType.STRING, allowNull: false })
  number: string;

  /** PENDING | SENT | FAILED */
  @Column({ type: DataType.STRING(20), defaultValue: "PENDING" })
  status: string;

  @Column({ type: DataType.DATE, allowNull: true })
  sentAt: Date;

  @Column({ type: DataType.TEXT, allowNull: true })
  errorMessage: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ButtonCampaignShipping;
