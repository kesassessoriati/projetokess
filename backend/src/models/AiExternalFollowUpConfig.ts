import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  BelongsTo,
  ForeignKey,
  Default,
  Unique
} from "sequelize-typescript";
import Company from "./Company";

@Table({ tableName: "AiExternalFollowUpConfigs" })
class AiExternalFollowUpConfig extends Model<AiExternalFollowUpConfig> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Unique
  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Default(false)
  @Column(DataType.BOOLEAN)
  enabled: boolean;

  @Column(DataType.TEXT)
  prompt: string;

  @Default(120)
  @Column
  abandonmentMinutes: number;

  @Default(24)
  @Column
  cooldownHours: number;

  @Default(30)
  @Column
  maxPerRun: number;

  @Default(100)
  @Column
  maxPerDay: number;

  @Default(60)
  @Column
  minDelaySeconds: number;

  @Default(180)
  @Column
  maxDelaySeconds: number;

  @Default(true)
  @Column(DataType.BOOLEAN)
  ignoreCompanyAiPaused: boolean;

  @Default("America/Sao_Paulo")
  @Column(DataType.TEXT)
  timezone: string;

  @Default(["08:00", "12:00", "17:30"])
  @Column(DataType.JSONB)
  executionTimes: string[];

  @Default(12)
  @Column
  lookbackHours: number;

  @Default(true)
  @Column(DataType.BOOLEAN)
  ignoreResolvedTickets: boolean;

  @Default(true)
  @Column(DataType.BOOLEAN)
  ignoreClosedTickets: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  typingSimulationEnabled: boolean;

  @Column(DataType.JSONB)
  metadata: object;

  @CreatedAt
  @Column(DataType.DATE(6))
  createdAt: Date;

  @UpdatedAt
  @Column(DataType.DATE(6))
  updatedAt: Date;
}

export default AiExternalFollowUpConfig;
