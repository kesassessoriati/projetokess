import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Default,
  ForeignKey,
  BelongsTo,
  HasMany
} from "sequelize-typescript";
import Company from "./Company";
import WhatsappWarmupSessionLog from "./WhatsappWarmupSessionLog";

@Table
class WhatsappWarmupSession extends Model<WhatsappWarmupSession> {
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

  @Default("draft")
  @Column(DataType.STRING(20))
  status: string;

  @Default("manual")
  @Column(DataType.STRING(20))
  scriptMode: string;

  @Default([])
  @Column(DataType.JSONB)
  connectionIds: number[];

  @Column
  starterWhatsappId: number;

  @Default(3)
  @Column
  turns: number;

  @Default(8)
  @Column
  minIntervalSeconds: number;

  @Default(20)
  @Column
  maxIntervalSeconds: number;

  @Column(DataType.DATE)
  scheduledAt: Date;

  @Column(DataType.DATE)
  startedAt: Date;

  @Column(DataType.DATE)
  endedAt: Date;

  @Default(0)
  @Column
  currentTurn: number;

  @Default(0)
  @Column
  currentStep: number;

  @Default(0)
  @Column
  messagesSent: number;

  @Column(DataType.TEXT)
  failureReason: string;

  @Default({})
  @Column(DataType.JSONB)
  aiConfig: Record<string, any>;

  @Default([])
  @Column(DataType.JSONB)
  scriptSteps: Record<string, any>[];

  @HasMany(() => WhatsappWarmupSessionLog)
  logs: WhatsappWarmupSessionLog[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default WhatsappWarmupSession;
