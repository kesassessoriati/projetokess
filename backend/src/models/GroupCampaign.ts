import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  Default,
  HasMany
} from "sequelize-typescript";
import Company from "./Company";
import Whatsapp from "./Whatsapp";
import GroupTemplate from "./GroupTemplate";
import GroupCampaignTarget from "./GroupCampaignTarget";
import GroupCampaignLog from "./GroupCampaignLog";

@Table({ tableName: "GroupCampaigns" })
class GroupCampaign extends Model<GroupCampaign> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @ForeignKey(() => GroupTemplate)
  @Column
  templateId: number;

  @BelongsTo(() => GroupTemplate)
  template: GroupTemplate;

  @Column(DataType.STRING)
  name: string;

  @Default("DRAFT")
  @Column(DataType.STRING(20))
  status: string; // DRAFT | SCHEDULED | PROCESSING | PAUSED | SENT | FAILED | CANCELED

  @Default("text")
  @Column(DataType.STRING(30))
  messageType: string;

  @Default("none")
  @Column(DataType.STRING(20))
  mentionsMode: string; // none | all | segmented

  @Column(DataType.TEXT)
  message: string;

  @Column(DataType.JSONB)
  buttons: any[];

  @Column(DataType.JSONB)
  listItems: any[];

  @Column(DataType.STRING)
  listButtonText: string;

  @Column(DataType.TEXT)
  listFooter: string;

  @Column(DataType.JSONB)
  carouselCards: any[];

  @Column(DataType.TEXT)
  pollName: string;

  @Column(DataType.JSONB)
  pollOptions: string[];

  @Default(1)
  @Column
  pollSelectableCount: number;

  @Default(false)
  @Column
  responseEnabled: boolean;

  @Column(DataType.STRING)
  responseKeyword: string;

  @Column(DataType.TEXT)
  responseMessage: string;

  @Column(DataType.JSONB)
  segmentedMentions: string[];

  @Column(DataType.JSONB)
  filters: Record<string, any>;

  @Column(DataType.JSONB)
  groupIds: number[];

  @Column(DataType.STRING)
  mediaPath: string;

  @Column(DataType.STRING)
  mediaName: string;

  @Column(DataType.DATE)
  scheduledAt: Date;

  @Column(DataType.DATE)
  startedAt: Date;

  @Column(DataType.DATE)
  completedAt: Date;

  @Column(DataType.STRING(30))
  recurrenceRule: string; // none | daily | weekly

  @Column(DataType.STRING(5))
  windowStart: string;

  @Column(DataType.STRING(5))
  windowEnd: string;

  @Default(0)
  @Column
  intervalSeconds: number;

  @Default(0)
  @Column
  totalGroups: number;

  @Default(0)
  @Column
  processedGroups: number;

  @Default(0)
  @Column
  successCount: number;

  @Default(0)
  @Column
  failedCount: number;

  @Column(DataType.TEXT)
  failureReason: string;

  @HasMany(() => GroupCampaignTarget)
  targets: GroupCampaignTarget[];

  @HasMany(() => GroupCampaignLog)
  logs: GroupCampaignLog[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default GroupCampaign;
