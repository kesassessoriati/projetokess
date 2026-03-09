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
  AllowNull
} from "sequelize-typescript";
import Company from "./Company";
import MySiteBoardCard from "./MySiteBoardCard";
import User from "./User";

@Table({
  tableName: "MySiteBoardAttachments"
})
class MySiteBoardAttachment extends Model<MySiteBoardAttachment> {
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

  @ForeignKey(() => MySiteBoardCard)
  @AllowNull(false)
  @Column
  cardId: number;

  @BelongsTo(() => MySiteBoardCard)
  card: MySiteBoardCard;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(true)
  @Column
  originalName: string;

  @AllowNull(true)
  @Column
  filename: string;

  @AllowNull(true)
  @Column
  mimeType: string;

  @AllowNull(true)
  @Column
  size: number;

  @AllowNull(true)
  @Column
  path: string;

  @AllowNull(true)
  @Column
  url: string;

  @AllowNull(false)
  @Column({ defaultValue: "file" })
  type: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default MySiteBoardAttachment;

