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
import Company from "./Company";
import PipelineAutomation from "./PipelineAutomation";
import Opportunity from "./Opportunity";

@Table({
    tableName: "PipelineAutomationLogs"
})
class PipelineAutomationLog extends Model<PipelineAutomationLog> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => Company)
    @Column
    companyId: number;

    @BelongsTo(() => Company)
    company: Company;

    @ForeignKey(() => PipelineAutomation)
    @Column
    automationId: number;

    @BelongsTo(() => PipelineAutomation)
    automation: PipelineAutomation;

    @ForeignKey(() => Opportunity)
    @Column
    opportunityId: number;

    @BelongsTo(() => Opportunity)
    opportunity: Opportunity;

    @Column
    eventId: string;

    @Column(DataType.ENUM("SUCCESS", "FAILED"))
    status: string;

    @Column(DataType.TEXT)
    error: string;

    @Column
    executionTime: number;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default PipelineAutomationLog;
