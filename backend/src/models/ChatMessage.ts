import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  BelongsTo,
  ForeignKey
} from "sequelize-typescript";
import User from "./User";
import Chat from "./Chat";
import Company from "./Company";

@Table({ tableName: "ChatMessages" })
class ChatMessage extends Model<ChatMessage> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Chat)
  @Column
  chatId: number;

  @ForeignKey(() => User)
  @Column
  senderId: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @Column({ defaultValue: "" })
  message: string;

  @Column
  mediaPath: string;

  @Column
  mediaName: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsTo(() => Chat)
  chat: Chat;

  @BelongsTo(() => User)
  sender: User;

  @BelongsTo(() => Company)
  company: Company;
}

export default ChatMessage;
