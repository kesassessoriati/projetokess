import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  BelongsTo,
  ForeignKey,
  HasMany
} from "sequelize-typescript";
import Company from "./Company";
import Whatsapp from "./Whatsapp";
import ButtonCampaignShipping from "./ButtonCampaignShipping";

@Table({ tableName: "ButtonCampaigns" })
class ButtonCampaign extends Model<ButtonCampaign> {
  @Column({ type: DataType.INTEGER, autoIncrement: true, primaryKey: true })
  id: number;

  @ForeignKey(() => Company)
  @Column({ type: DataType.INTEGER, allowNull: false })
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => Whatsapp)
  @Column({ type: DataType.INTEGER, allowNull: true })
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  /** DRAFT | SENDING | COMPLETED | FAILED | CANCELLED */
  @Column({ type: DataType.STRING(20), defaultValue: "DRAFT" })
  status: string;

  /** buttons | list */
  @Column({ type: DataType.STRING(20), defaultValue: "buttons" })
  messageType: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  message: string;

  @Column({ type: DataType.STRING, allowNull: true })
  footer: string;

  /** Array of { displayText, type, value } */
  @Column({ type: DataType.JSONB, allowNull: true })
  buttons: object;

  /** Array of { title, rows: [{ title, rowId, description }] } */
  @Column({ type: DataType.JSONB, allowNull: true })
  listSections: object;

  @Column({ type: DataType.STRING, allowNull: true })
  listButtonText: string;

  /** Array of phone numbers (string) */
  @Column({ type: DataType.JSONB, allowNull: true })
  targetNumbers: string[];

  @Column({ type: DataType.INTEGER, defaultValue: 3 })
  intervalSeconds: number;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  totalTargets: number;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  processedTargets: number;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  successCount: number;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  failedCount: number;

  @Column({ type: DataType.TEXT, allowNull: true })
  failureReason: string;

  @Column({ type: DataType.DATE, allowNull: true })
  scheduledAt: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  startedAt: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  completedAt: Date;

  @HasMany(() => ButtonCampaignShipping)
  shippings: ButtonCampaignShipping[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ButtonCampaign;
