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
import PipelineStage from "./PipelineStage";
import PipelineTemplate from "./PipelineTemplate";
import Opportunity from "./Opportunity";

@Table({
    tableName: "Pipelines"
})
class Pipeline extends Model<Pipeline> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => Company)
    @Column
    companyId: number;

    @BelongsTo(() => Company)
    company: Company;

    @ForeignKey(() => PipelineTemplate)
    @Column
    templateId: number;

    @BelongsTo(() => PipelineTemplate)
    template: PipelineTemplate;

    @Column
    name: string;

    @Default(false)
    @Column
    isDefault: boolean;

    @Default(true)
    @Column
    isActive: boolean;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;

    @HasMany(() => PipelineStage)
    stages: PipelineStage[];

    @HasMany(() => Opportunity)
    opportunities: Opportunity[];
}

export default Pipeline;
