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
import Pipeline from "./Pipeline";
import Opportunity from "./Opportunity";

@Table({
    tableName: "PipelineStages"
})
class PipelineStage extends Model<PipelineStage> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => Pipeline)
    @Column
    pipelineId: number;

    @BelongsTo(() => Pipeline)
    pipeline: Pipeline;

    @ForeignKey(() => Company)
    @Column
    companyId: number;

    @BelongsTo(() => Company)
    company: Company;

    @Column
    name: string;

    @Default(0)
    @Column
    order: number;

    @Default("#FFFFFF")
    @Column
    color: string;

    @Default(0)
    @Column
    probability: number;

    @Default(false)
    @Column
    isLocked: boolean;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;

    @HasMany(() => Opportunity, { foreignKey: "stageId" })
    opportunities: Opportunity[];
}

export default PipelineStage;
