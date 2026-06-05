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
  AllowNull,
  Default,
  DataType,
} from "sequelize-typescript";
import FollowUpCampaign from "./FollowUpCampaign";

@Table({ tableName: "FollowUpStages" })
class FollowUpStage extends Model<FollowUpStage> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => FollowUpCampaign)
  @Column
  followUpCampaignId: number;

  @Default(1)
  @Column
  order: number;

  @Default(60)
  @Column
  delayMinutes: number;

  @AllowNull(true)
  @Column(DataType.STRING)
  title: string;

  @Default("text")
  @Column(DataType.STRING(20))
  messageType: string; // text only in the active flow; media/button values are preserved for future reactivation

  @AllowNull(true)
  @Column(DataType.TEXT)
  message: string;

  @AllowNull(true)
  @Column(DataType.JSON)
  buttons: object[];

  @AllowNull(true)
  @Column(DataType.STRING)
  mediaUrl: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  mediaType: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  mediaCaption: string;

  @AllowNull(true)
  @Column(DataType.INTEGER)
  mediaId: number;

  @Default(false)
  @Column
  useAiRewrite: boolean;

  @Default(true)
  @Column
  isActive: boolean;

  // Step type: determines what this stage does
  @Default("send_message")
  @Column(DataType.STRING(20))
  stepType: string; // send_message | wait | move_crm | add_tag | condition | webhook

  @Default({})
  @Column(DataType.JSON)
  stepConfig: object; // shape varies per stepType

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsTo(() => FollowUpCampaign)
  followUpCampaign: FollowUpCampaign;
}

export default FollowUpStage;
