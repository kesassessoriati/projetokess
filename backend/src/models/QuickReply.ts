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
  interactiveType: string;

  @Column(DataType.JSON)
  interactiveConfig: any;

  @Column
  get mediaUrl(): string | null {
    const storedPath = this.getDataValue("mediaUrl");

    if (storedPath) {
      const normalizedPath = String(storedPath)
        .replace(/\\/g, "/")
        .replace(/^\/+/, "");

      if (normalizedPath.startsWith("media-drive/")) {
        return `${process.env.BACKEND_URL}${
          process.env.PROXY_PORT ? `:${process.env.PROXY_PORT}` : ""
        }/public/company${this.companyId}/${normalizedPath}`;
      }

      const quickReplyPath = normalizedPath.startsWith("quickReply/")
        ? normalizedPath
        : `quickReply/${normalizedPath}`;

      return `${process.env.BACKEND_URL}${
        process.env.PROXY_PORT ? `:${process.env.PROXY_PORT}` : ""
      }/public/company${this.companyId}/${quickReplyPath}`;
    }
    return null;
  }

  @Column
  mediaType: string;

  @Column
  mediaName: string;

  @Column
  mediaSource: string;

  @Column
  mediaFileId: number;

  @Column
  sortOrder: number;

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
