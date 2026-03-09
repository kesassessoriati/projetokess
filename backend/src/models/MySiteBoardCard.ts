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
  DataType
} from "sequelize-typescript";
import Company from "./Company";
import MySiteBoardColumn from "./MySiteBoardColumn";
import MySiteBoardChecklistItem from "./MySiteBoardChecklistItem";
import MySiteBoardComment from "./MySiteBoardComment";
import MySiteBoardAttachment from "./MySiteBoardAttachment";

@Table({
  tableName: "MySiteBoardCards"
})
class MySiteBoardCard extends Model<MySiteBoardCard> {
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

  @ForeignKey(() => MySiteBoardColumn)
  @AllowNull(false)
  @Column
  columnId: number;

  @BelongsTo(() => MySiteBoardColumn)
  column: MySiteBoardColumn;

  @AllowNull(false)
  @Column
  title: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  description: string;

  @AllowNull(true)
  @Column
  url: string;

  @AllowNull(true)
  @Column
  responsible: string;

  @AllowNull(true)
  @Column
  priority: string;

  @AllowNull(true)
  @Column(DataType.DATEONLY)
  dueDate: string;

  @AllowNull(true)
  @Column(DataType.JSON)
  tags: string[];

  @AllowNull(true)
  @Column(DataType.TEXT)
  notes: string;

  @AllowNull(true)
  @Column
  color: string;

  @AllowNull(false)
  @Column({ defaultValue: 0 })
  order: number;

  @HasMany(() => MySiteBoardChecklistItem)
  checklistItems: MySiteBoardChecklistItem[];

  @HasMany(() => MySiteBoardComment)
  comments: MySiteBoardComment[];

  @HasMany(() => MySiteBoardAttachment)
  attachments: MySiteBoardAttachment[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default MySiteBoardCard;

