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

  @Default("manual")
  @Column(DataType.STRING(30))
  sourceType: string; // 'campaign' | 'manual'

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
