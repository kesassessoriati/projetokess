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
import Opportunity from "./Opportunity";

@Table({
    tableName: "OpportunityPredictions"
})
class OpportunityPrediction extends Model<OpportunityPrediction> {
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

    @Default(0)
    @Column(DataType.FLOAT)
    predictedCloseProbability: number;

    @Default(0)
    @Column
    predictedDaysToClose: number;

    @Default("LOW")
    @Column(DataType.ENUM("LOW", "MEDIUM", "HIGH"))
    riskLevel: string;

    @Column(DataType.TEXT)
    explanation: string;

    @Default("v1")
    @Column
    aiModelVersion: string;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default OpportunityPrediction;
