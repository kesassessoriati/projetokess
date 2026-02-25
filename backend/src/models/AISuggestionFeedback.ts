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
import Opportunity from "./Opportunity";

@Table({
    tableName: "AISuggestionFeedbacks"
})
class AISuggestionFeedback extends Model<AISuggestionFeedback> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => Opportunity)
    @Column
    opportunityId: number;

    @BelongsTo(() => Opportunity)
    opportunity: Opportunity;

    @ForeignKey(() => Company)
    @Column
    companyId: number;

    @BelongsTo(() => Company)
    company: Company;

    @Column
    suggestedStageId: number;

    @Column
    actualStageId: number;

    @Column(DataType.ENUM("AGREE", "DISAGREE"))
    feedback: string;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default AISuggestionFeedback;
