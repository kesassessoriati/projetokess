import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Default,
  ForeignKey,
  BelongsTo,
  HasMany
} from "sequelize-typescript";

import Company from "./Company";
import Whatsapp from "./Whatsapp";
import ChipActivityLog from "./ChipActivityLog";

@Table({
  tableName: "chips",
  underscored: true,
  timestamps: true
})
class Chip extends Model<Chip> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @AllowNull(false)
  @Column({ field: "company_id" })
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @AllowNull(true)
  @Column(DataType.STRING(30))
  number?: string | null;

  @Column({ field: "source_connection_name", type: DataType.STRING(120) })
  sourceConnectionName?: string | null;

  @Column({ field: "source_connection_status", type: DataType.STRING(40) })
  sourceConnectionStatus?: string | null;

  @Column({ field: "source_connection_id", type: DataType.INTEGER })
  sourceConnectionId?: number | null;

  @Default("manual")
  @Column({ field: "sync_source", type: DataType.STRING(40) })
  syncSource: string;

  @Default({})
  @Column({ field: "source_metadata", type: DataType.JSONB })
  sourceMetadata?: Record<string, any>;

  @Column({ field: "last_channel_sync_at", type: DataType.DATE })
  lastChannelSyncAt?: Date | null;

  @Column(DataType.STRING(120))
  carrier?: string;

  @Column({ field: "plan_type", type: DataType.STRING(120) })
  planType?: string;

  @Column({ field: "last_recharge_at", type: DataType.DATEONLY })
  lastRechargeAt?: string;

  @Default(30)
  @Column({ field: "recharge_periodicity_days", type: DataType.INTEGER })
  rechargePeriodicityDays: number;

  @Default(0)
  @Column({ field: "recharge_value", type: DataType.DECIMAL(10, 2) })
  rechargeValue: string;

  @Column({ field: "predicted_block_at", type: DataType.DATEONLY })
  predictedBlockAt?: string;

  @ForeignKey(() => Whatsapp)
  @Column({ field: "whatsapp_id", type: DataType.INTEGER })
  whatsappId?: number | null;

  @BelongsTo(() => Whatsapp)
  whatsapp?: Whatsapp | null;

  @Column(DataType.STRING(255))
  device?: string;

  @Column(DataType.STRING(255))
  responsible?: string;

  @Default("inactive")
  @Column(DataType.STRING(30))
  status: string;

  @Default(0)
  @Column({ field: "health_score", type: DataType.INTEGER })
  healthScore: number;

  @Default(1)
  @Column({ field: "warmup_level", type: DataType.INTEGER })
  warmupLevel: number;

  @Default(20)
  @Column({ field: "warmup_message_limit", type: DataType.INTEGER })
  warmupMessageLimit: number;

  @Default(5)
  @Column({ field: "warmup_min_interval", type: DataType.INTEGER })
  warmupMinInterval: number;

  @Default(15)
  @Column({ field: "warmup_max_interval", type: DataType.INTEGER })
  warmupMaxInterval: number;

  @Default(0)
  @Column({ field: "messages_sent_today", type: DataType.INTEGER })
  messagesSentToday: number;

  @Default(0)
  @Column({ field: "total_messages_sent", type: DataType.INTEGER })
  totalMessagesSent: number;

  @Default(0)
  @Column({ field: "connected_minutes", type: DataType.INTEGER })
  connectedMinutes: number;

  @Default(0)
  @Column({ field: "disconnect_count", type: DataType.INTEGER })
  disconnectCount: number;

  @Default("low")
  @Column({ field: "blocking_risk_level", type: DataType.STRING(20) })
  blockingRiskLevel: string;

  @Column({ field: "blocking_risk_reason", type: DataType.TEXT })
  blockingRiskReason?: string;

  @Column({ field: "activation_date", type: DataType.DATEONLY })
  activationDate?: string;

  @Column({ field: "last_connected_at", type: DataType.DATE })
  lastConnectedAt?: Date;

  @Column({ field: "last_disconnected_at", type: DataType.DATE })
  lastDisconnectedAt?: Date;

  @Default("unknown")
  @Column({ field: "session_status", type: DataType.STRING(40) })
  sessionStatus: string;

  @Column(DataType.TEXT)
  notes?: string;

  @HasMany(() => ChipActivityLog, "chipId")
  logs: ChipActivityLog[];

  @CreatedAt
  @Column({ field: "created_at" })
  createdAt: Date;

  @UpdatedAt
  @Column({ field: "updated_at" })
  updatedAt: Date;
}

export default Chip;
