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
    HasMany,
    HasOne
} from "sequelize-typescript";
import Company from "./Company";
import Pipeline from "./Pipeline";
import PipelineStage from "./PipelineStage";
import Contact from "./Contact";
import User from "./User";
import OpportunityMovement from "./OpportunityMovement";
import OpportunityEvent from "./OpportunityEvent";
import OpportunityPrediction from "./OpportunityPrediction";

@Table({
    tableName: "Opportunities",
    version: true
})
class Opportunity extends Model<Opportunity> {
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

    @ForeignKey(() => PipelineStage)
    @Column
    stageId: number;

    @BelongsTo(() => PipelineStage, { foreignKey: "stageId" })
    stage: PipelineStage;

    @ForeignKey(() => Contact)
    @Column
    contactId: number;

    @BelongsTo(() => Contact)
    contact: Contact;

    @Column
    title: string;

    @Default(0)
    @Column(DataType.DECIMAL(12, 2))
    value: number;

    @Default(0)
    @Column
    score: number;

    @Default("COLD")
    @Column(DataType.ENUM("COLD", "WARM", "HOT"))
    temperature: string;

    @Column(DataType.DATE)
    slaDeadline: Date;

    @ForeignKey(() => User)
    @Column
    assignedUserId: number;

    @BelongsTo(() => User)
    assignedUser: User;

    @Default("OPEN")
    @Column(DataType.ENUM("OPEN", "WON", "LOST"))
    status: string;

    @Column
    aiSuggestedStageId: number;

    @BelongsTo(() => PipelineStage, { foreignKey: "aiSuggestedStageId" })
    aiSuggestedStage: PipelineStage;

    @Column
    lastMovedBy: string;

    @Column
    version: number;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;

    @HasMany(() => OpportunityMovement, { foreignKey: "opportunityId", as: "movements" })
    movements: OpportunityMovement[];

    @HasOne(() => OpportunityPrediction, { foreignKey: "opportunityId", as: "prediction" })
    prediction: OpportunityPrediction;

    @HasMany(() => OpportunityEvent)
    events: OpportunityEvent[];
}

export default Opportunity;
