import {
  AutoIncrement,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt
} from "sequelize-typescript";
import Company from "./Company";
import Prompt from "./Prompt";

@Table({ tableName: "AIUsageLogs" })
class AIUsageLog extends Model<AIUsageLog> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => Prompt)
  @Column
  promptId: number | null;

  @BelongsTo(() => Prompt)
  prompt: Prompt | null;

  @Column(DataType.STRING)
  provider: string;

  @Column(DataType.STRING)
  usageMode: string;

  @Column(DataType.STRING)
  requestType: string;

  @Column(DataType.STRING)
  model: string | null;

  @Column(DataType.INTEGER)
  creditsConsumed: number;

  @Column(DataType.STRING)
  status: string;

  @Column(DataType.STRING)
  errorCode: string | null;

  @Column({ type: DataType.JSONB, defaultValue: {} })
  metadata: Record<string, any>;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AIUsageLog;
