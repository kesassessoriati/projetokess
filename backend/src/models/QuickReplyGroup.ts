/* eslint-disable no-use-before-define */
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
  HasMany
} from "sequelize-typescript";

import Company from "./Company";
import QuickReply from "./QuickReply";

@Table({ tableName: "quick_reply_groups" })
class QuickReplyGroup extends Model<QuickReplyGroup> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @Column
  name: string;

  @Column
  description: string;

  @Column
  sortOrder: number;

  @BelongsTo(() => Company)
  company: Company;

  @HasMany(() => QuickReply)
  quickReplies: QuickReply[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default QuickReplyGroup;
