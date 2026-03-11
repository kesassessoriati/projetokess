import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  AutoIncrement,
  DataType
} from "sequelize-typescript";

import Company from "./Company";
import User from "./User";
import QuickReplyGroup from "./QuickReplyGroup";

@Table({ tableName: "quick_replies" })
class QuickReply extends Model<QuickReply> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => QuickReplyGroup)
  @Column
  groupId: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @Column
  shortcut: string;

  @Column(DataType.TEXT)
  message: string;

  @Column
  get mediaUrl(): string | null {
    if (this.getDataValue("mediaUrl")) {
      return `${process.env.BACKEND_URL}${
        process.env.PROXY_PORT ? `:${process.env.PROXY_PORT}` : ""
      }/public/company${this.companyId}/quickReply/${this.getDataValue(
        "mediaUrl"
      )}`;
    }
    return null;
  }

  @Column
  mediaType: string;

  @ForeignKey(() => User)
  @Column
  createdBy: number;

  @BelongsTo(() => QuickReplyGroup)
  group: QuickReplyGroup;

  @BelongsTo(() => Company)
  company: Company;

  @BelongsTo(() => User)
  user: User;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default QuickReply;
