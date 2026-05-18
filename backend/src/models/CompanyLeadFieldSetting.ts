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
  DataType,
  Default
} from "sequelize-typescript";

import Company from "./Company";

@Table({
  tableName: "company_lead_field_settings"
})
class CompanyLeadFieldSetting extends Model<CompanyLeadFieldSetting> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column({ field: "company_id" })
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Column({ field: "field_key" })
  fieldKey: string;

  @Column
  label: string;

  @Default("text")
  @Column({ field: "field_type" })
  fieldType: string;

  @Default(true)
  @Column({ type: DataType.BOOLEAN })
  visible: boolean;

  @Default(false)
  @Column({ field: "is_custom", type: DataType.BOOLEAN })
  isCustom: boolean;

  @Default(true)
  @Column({ type: DataType.BOOLEAN })
  active: boolean;

  @Default(0)
  @Column({ field: "sort_order" })
  sortOrder: number;

  @CreatedAt
  @Column({ field: "created_at" })
  createdAt: Date;

  @UpdatedAt
  @Column({ field: "updated_at" })
  updatedAt: Date;
}

export default CompanyLeadFieldSetting;
