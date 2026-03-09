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
import MySiteBoardCard from "./MySiteBoardCard";
import User from "./User";

@Table({
  tableName: "MySiteBoardComments"
})
class MySiteBoardComment extends Model<MySiteBoardComment> {
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
  @Column(DataType.TEXT)
  message: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default MySiteBoardComment;

