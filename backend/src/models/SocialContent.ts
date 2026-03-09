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
  DataType
} from "sequelize-typescript";

import Company from "./Company";
import SocialBoard from "./SocialBoard";
import SocialStage from "./SocialStage";
import User from "./User";

@Table({
  tableName: "SocialContents"
})
class SocialContent extends Model<SocialContent> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @AllowNull(false)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => SocialBoard)
  @AllowNull(false)
  @Column
  boardId: number;

  @BelongsTo(() => SocialBoard)
  board: SocialBoard;

  @ForeignKey(() => SocialStage)
  @AllowNull(false)
  @Column
  stageId: number;

  @BelongsTo(() => SocialStage)
  stage: SocialStage;

  @AllowNull(false)
  @Column
  title: string;

  @AllowNull(true)
  @Column
  entityName: string;

  @AllowNull(true)
  @Column
  platform: string;

  @AllowNull(true)
  @Column
  contentType: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  description: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  copyText: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  scriptText: string;

  @AllowNull(true)
  @Column(DataType.DATEONLY)
  publishDate: string;

  @AllowNull(true)
  @Column
  publishTime: string;

  @AllowNull(true)
  @Column
  driveLink: string;

  @AllowNull(true)
  @Column
  siteUrl: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  notes: string;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column
  responsibleId: number;

  @BelongsTo(() => User)
  responsible: User;

  @AllowNull(true)
  @Column
  priority: string;

  @AllowNull(true)
  @Column(DataType.JSON)
  tags: string[];

  @AllowNull(false)
  @Column({ defaultValue: 0 })
  order: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default SocialContent;

