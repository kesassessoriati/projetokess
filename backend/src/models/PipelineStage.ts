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
import CrmLead from "./CrmLead";

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

    /**
     * Optional lead status that is automatically applied when a card/opportunity
     * is moved to this stage. Allowed values mirror CrmLead.status enum:
     * novo | contactado | qualificado | reuniao_agendada | nao_qualificado | convertido | perdido
     */
    @Column({ allowNull: true, defaultValue: null })
    linkedStatus: string;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;

    @HasMany(() => Opportunity, { foreignKey: "stageId" })
    opportunities: Opportunity[];

    @HasMany(() => CrmLead, { foreignKey: "stageId" })
    leads: CrmLead[];
}

export default PipelineStage;
