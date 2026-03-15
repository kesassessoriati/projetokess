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
  BelongsTo
} from "sequelize-typescript";

import Company from "./Company";
import Chip from "./Chip";

@Table({
  tableName: "chip_activity_logs",
  underscored: true,
  timestamps: true
})
class ChipActivityLog extends Model<ChipActivityLog> {
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

  @ForeignKey(() => Chip)
  @AllowNull(false)
  @Column({ field: "chip_id" })
  chipId: number;

  @BelongsTo(() => Chip)
  chip: Chip;

  @AllowNull(false)
  @Column({ field: "event_type", type: DataType.STRING(40) })
  eventType: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  description: string;

  @Default(DataType.NOW)
  @Column({ field: "event_date", type: DataType.DATE })
  eventDate: Date;

  @Default({})
  @Column(DataType.JSONB)
  metadata: Record<string, any>;

  @CreatedAt
  @Column({ field: "created_at" })
  createdAt: Date;

  @UpdatedAt
  @Column({ field: "updated_at" })
  updatedAt: Date;
}

export default ChipActivityLog;
