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
import Pipeline from "./Pipeline";
import PipelineStage from "./PipelineStage";

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

  @AllowNull(true)
  @Column(DataType.TEXT)
  description: string;

  @Default("all")
  @Column(DataType.STRING(30))
  targetMode: string;

  @Default([])
  @Column(DataType.JSON)
  tagIds: number[];

  @AllowNull(true)
  @ForeignKey(() => Pipeline)
  @Column
  pipelineId: number;

  @AllowNull(true)
  @ForeignKey(() => PipelineStage)
  @Column
  pipelineStageId: number;

  @Default(false)
  @Column
  smartMode: boolean;

  @Default(false)
  @Column
  aiEnabled: boolean;

  @AllowNull(true)
  @Column(DataType.TEXT)
  recoveryInstruction: string;

  @Default([])
  @Column(DataType.JSON)
  successKeywords: string[];

  @Default([])
  @Column(DataType.JSON)
  stopKeywords: string[];

  // Trigger: when to start the follow-up sequence
  @Default("message_sent")
  @Column(DataType.STRING(30))
  triggerType: string; // message_sent | no_reply | time_in_crm_stage | tag_added | stage_change | unread_after_hours

  @Default({})
  @Column(DataType.JSON)
  triggerConfig: object; // shape varies per triggerType

  // Reply behaviour
  @Default(true)
  @Column
  stopOnReply: boolean;

  @Default("none")
  @Column(DataType.STRING(30))
  actionOnReply: string; // none | activate_ai | move_crm | add_tag

  @Default({})
  @Column(DataType.JSON)
  replyActionConfig: object; // { pipelineId, stageId } | { tagId } | {}

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

  @BelongsTo(() => Pipeline)
  pipeline: Pipeline;

  @BelongsTo(() => PipelineStage, { foreignKey: "pipelineStageId" })
  pipelineStage: PipelineStage;

  @HasMany(() => FollowUpStage, { foreignKey: "followUpCampaignId" })
  stages: FollowUpStage[];
}

export default FollowUpCampaign;
