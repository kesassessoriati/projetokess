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
    BelongsTo,
    Default
} from "sequelize-typescript";
import Company from "./Company";
import Pipeline from "./Pipeline";
import PipelineStage from "./PipelineStage";

@Table({
    tableName: "PipelineAutomations"
})
class PipelineAutomation extends Model<PipelineAutomation> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => Company)
    @Column
    companyId: number;

    @BelongsTo(() => Company)
    company: Company;

    @ForeignKey(() => Pipeline)
    @Column
    pipelineId: number;

    @BelongsTo(() => Pipeline)
    pipeline: Pipeline;

    @Column
    name: string;

    @Column({
        type: DataType.ENUM(
            "ON_ENTER_STAGE",
            "ON_EXIT_STAGE",
            "ON_SLA_EXPIRED",
            "ON_OPPORTUNITY_CREATED"
        )
    })
    trigger: string;

    @ForeignKey(() => PipelineStage)
    @Column
    stageId: number;

    @BelongsTo(() => PipelineStage)
    stage: PipelineStage;

    @Default({})
    @Column(DataType.JSONB)
    condition: any;

    @Column
    actionType: string;

    @Default({})
    @Column(DataType.JSONB)
    actionConfig: any;

    @Default(true)
    @Column
    isActive: boolean;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default PipelineAutomation;
