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

@Table({ tableName: "AdTrackingIntegrations" })
class AdTrackingIntegration extends Model<AdTrackingIntegration> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Column(DataType.ENUM("meta", "google"))
  provider: "meta" | "google";

  @Default(false)
  @Column
  active: boolean;

  @Default({})
  @Column(DataType.JSONB)
  credentials: Record<string, any>;

  @Default({})
  @Column(DataType.JSONB)
  settings: Record<string, any>;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AdTrackingIntegration;
