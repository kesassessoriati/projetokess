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
import CrmLead from "./CrmLead";

@Table({
    tableName: "lead_messages"
})
class LeadMessage extends Model<LeadMessage> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => CrmLead)
    @Column
    leadId: number;

    @BelongsTo(() => CrmLead)
    lead: CrmLead;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    senderType: string;

    @Column({
        type: DataType.TEXT,
        allowNull: false
    })
    message: string;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default LeadMessage;
