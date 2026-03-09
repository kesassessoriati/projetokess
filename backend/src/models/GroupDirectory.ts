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
  HasMany,
  Default
} from "sequelize-typescript";
import Company from "./Company";
import Whatsapp from "./Whatsapp";
import GroupMember from "./GroupMember";
import GroupCampaignTarget from "./GroupCampaignTarget";

@Table({ tableName: "GroupDirectories" })
class GroupDirectory extends Model<GroupDirectory> {
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

  @Column(DataType.STRING)
  groupJid: string;

  @Column(DataType.STRING)
  subject: string;

  @Column(DataType.TEXT)
  description: string;

  @Column(DataType.STRING)
  owner: string;

  @Default(0)
  @Column
  memberCount: number;

  @Default(0)
  @Column
  adminCount: number;

  @Column(DataType.DATE)
  lastSyncAt: Date;

  @Default(false)
  @Column
  isFavorite: boolean;

  @Default([])
  @Column(DataType.JSONB)
  tags: string[];

  @Default(true)
  @Column
  isActive: boolean;

  @HasMany(() => GroupMember)
  members: GroupMember[];

  @HasMany(() => GroupCampaignTarget)
  campaignTargets: GroupCampaignTarget[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default GroupDirectory;
