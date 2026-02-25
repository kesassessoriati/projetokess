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
    BelongsTo
} from "sequelize-typescript";
import Opportunity from "./Opportunity";
import PipelineStage from "./PipelineStage";

@Table({
    tableName: "OpportunityMovements"
})
class OpportunityMovement extends Model<OpportunityMovement> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => Opportunity)
    @Column
    opportunityId: number;

    @BelongsTo(() => Opportunity)
    opportunity: Opportunity;

    @ForeignKey(() => PipelineStage)
    @Column
    fromStageId: number;

    @BelongsTo(() => PipelineStage, { foreignKey: "fromStageId" })
    fromStage: PipelineStage;

    @ForeignKey(() => PipelineStage)
    @Column
    toStageId: number;

    @BelongsTo(() => PipelineStage, { foreignKey: "toStageId" })
    toStage: PipelineStage;

    @Default("USER")
    @Column(DataType.ENUM("USER", "AI", "AUTOMATION"))
    movedBy: string;

    @Column(DataType.TEXT)
    reason: string;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default OpportunityMovement;
