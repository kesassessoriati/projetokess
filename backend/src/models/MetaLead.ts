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
import Contact from "./Contact";
import CrmLead from "./CrmLead";
import MetaLeadIntegration from "./MetaLeadIntegration";

@Table({ tableName: "meta_leads", underscored: true })
class MetaLead extends Model<MetaLead> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column({ field: "company_id" })
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => MetaLeadIntegration)
  @Column({ field: "integration_id" })
  integrationId: number;

  @BelongsTo(() => MetaLeadIntegration)
  integration: MetaLeadIntegration;

  @ForeignKey(() => Contact)
  @Column({ field: "contact_id" })
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

  @ForeignKey(() => CrmLead)
  @Column({ field: "crm_lead_id" })
  crmLeadId: number;

  @BelongsTo(() => CrmLead)
  crmLead: CrmLead;

  @Column({ field: "leadgen_id", type: DataType.STRING(64) })
  leadgenId: string;

  @Column({ field: "form_id", type: DataType.STRING(64) })
  formId: string;

  @Column({ field: "page_id", type: DataType.STRING(64) })
  pageId: string;

  @Column({ field: "ad_id", type: DataType.STRING(64) })
  adId: string;

  @Column({ field: "campaign_id", type: DataType.STRING(64) })
  campaignId: string;

  @Column({ field: "adset_id", type: DataType.STRING(64) })
  adsetId: string;

  @Column({ field: "lead_name", type: DataType.STRING(255) })
  leadName: string;

  @Column({ field: "lead_phone", type: DataType.STRING(32) })
  leadPhone: string;

  @Column({ field: "lead_email", type: DataType.STRING(255) })
  leadEmail: string;

  @Column({ field: "raw_payload", type: DataType.JSONB })
  rawPayload: Record<string, any>;

  @Column({ field: "normalized_payload", type: DataType.JSONB })
  normalizedPayload: Record<string, any>;

  @Default("received")
  @Column(DataType.ENUM("received", "processing", "processed", "duplicate", "error"))
  status: "received" | "processing" | "processed" | "duplicate" | "error";

  @Column({ field: "error_message", type: DataType.TEXT })
  errorMessage: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default MetaLead;
