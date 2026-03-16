import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  HasMany,
  AllowNull,
  Default,
  DataType,
} from "sequelize-typescript";
import Company from "./Company";
import Whatsapp from "./Whatsapp";
import FollowUpStage from "./FollowUpStage";
import FollowUpBoard from "./FollowUpBoard";

@Table({ tableName: "FollowUpCampaigns" })
class FollowUpCampaign extends Model<FollowUpCampaign> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @AllowNull(true)
  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @Default(true)
  @Column
  isActive: boolean;

  // Deprecated: runtime no longer branches by source type.
  // Follow-up campaigns now use a single trigger: any outbound message
  // persisted to the Message table for the ticket/contact cycle.
  @Default("manual")
  @Column(DataType.STRING(30))
  sourceType: string; // legacy: 'campaign' | 'manual'; current canonical value: 'message_sent'

  @AllowNull(true)
  @Column(DataType.STRING)
  boardColumn: string;

  @AllowNull(true)
  @ForeignKey(() => FollowUpBoard)
  @Column
  boardId: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsTo(() => Company)
  company: Company;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @BelongsTo(() => FollowUpBoard)
  board: FollowUpBoard;

  @HasMany(() => FollowUpStage, { foreignKey: "followUpCampaignId" })
  stages: FollowUpStage[];
}

export default FollowUpCampaign;
