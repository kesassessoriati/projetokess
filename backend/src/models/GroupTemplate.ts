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
  Default
} from "sequelize-typescript";
import Company from "./Company";

@Table({ tableName: "GroupTemplates" })
class GroupTemplate extends Model<GroupTemplate> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Column(DataType.STRING)
  name: string;

  @Default("text")
  @Column(DataType.STRING(20))
  messageType: string;

  @Column(DataType.TEXT)
  message: string;

  @Column(DataType.JSONB)
  buttons: any[];

  @Column(DataType.JSONB)
  listItems: any[];

  @Column(DataType.JSONB)
  segmentedMentions: string[];

  @Column(DataType.STRING)
  mediaPath: string;

  @Column(DataType.STRING)
  mediaName: string;

  @Default(false)
  @Column
  isFavorite: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default GroupTemplate;
