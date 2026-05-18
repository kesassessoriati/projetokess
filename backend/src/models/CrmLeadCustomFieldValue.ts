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
  DataType
} from "sequelize-typescript";

import Company from "./Company";
import CrmLead from "./CrmLead";
import CompanyLeadFieldSetting from "./CompanyLeadFieldSetting";

@Table({
  tableName: "crm_lead_custom_field_values"
})
class CrmLeadCustomFieldValue extends Model<CrmLeadCustomFieldValue> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column({ field: "company_id" })
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => CrmLead)
  @Column({ field: "lead_id" })
  leadId: number;

  @BelongsTo(() => CrmLead)
  lead: CrmLead;

  @ForeignKey(() => CompanyLeadFieldSetting)
  @Column({ field: "field_id" })
  fieldId: number;

  @BelongsTo(() => CompanyLeadFieldSetting)
  field: CompanyLeadFieldSetting;

  @Column({ type: DataType.TEXT })
  value: string;

  @CreatedAt
  @Column({ field: "created_at" })
  createdAt: Date;

  @UpdatedAt
  @Column({ field: "updated_at" })
  updatedAt: Date;
}

export default CrmLeadCustomFieldValue;
