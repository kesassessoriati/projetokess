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
  DataType,
  Default,
} from "sequelize-typescript";

import User from "./User";
import Company from "./Company";

@Table({
  tableName: "Notifications",
})
class Notification extends Model<Notification> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => Company)
  @AllowNull(false)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  /**
   * task_due | task_overdue | task_created | message | system | appointment
   */
  @AllowNull(false)
  @Default("system")
  @Column(DataType.STRING(50))
  type: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  title: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  body: string;

  /**
   * unread | read
   */
  @AllowNull(false)
  @Default("unread")
  @Column(DataType.ENUM("unread", "read"))
  status: "unread" | "read";

  /**
   * in_app | email | whatsapp
   */
  @AllowNull(false)
  @Default("in_app")
  @Column(DataType.ENUM("in_app", "email", "whatsapp"))
  channel: "in_app" | "email" | "whatsapp";

  /**
   * Flexible JSON payload: { taskId, ticketId, leadId, ... }
   */
  @AllowNull(true)
  @Column(DataType.JSON)
  metadata: Record<string, any>;

  @AllowNull(true)
  @Column(DataType.DATE)
  scheduledAt: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  sentAt: Date;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Notification;
