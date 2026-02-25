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

@Table({
    tableName: "OpportunityEvents"
})
class OpportunityEvent extends Model<OpportunityEvent> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => Opportunity)
    @Column
    opportunityId: number;

    @BelongsTo(() => Opportunity)
    opportunity: Opportunity;

    @Column
    type: string;

    @Default({})
    @Column(DataType.JSONB)
    metadata: any;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default OpportunityEvent;
