import {
    Table,
    Column,
    CreatedAt,
    UpdatedAt,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    ForeignKey,
    BelongsTo
} from "sequelize-typescript";
import CrmLead from "./CrmLead";
import Company from "./Company";

@Table({
    tableName: "lead_attachments"
})
class LeadAttachment extends Model<LeadAttachment> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => CrmLead)
    @Column({ field: "lead_id" })
    leadId: number;

    @BelongsTo(() => CrmLead, "leadId")
    lead: CrmLead;

    @ForeignKey(() => Company)
    @Column({ field: "company_id" })
    companyId: number;

    @BelongsTo(() => Company, "companyId")
    company: Company;

    @Column({ field: "original_name" })
    originalName: string;

    @Column
    filename: string;

    @Column(DataType.STRING)
    mimetype: string;

    @Column(DataType.INTEGER)
    size: number;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default LeadAttachment;
