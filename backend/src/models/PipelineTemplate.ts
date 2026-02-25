import {
    Table,
    Column,
    CreatedAt,
    UpdatedAt,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    Default
} from "sequelize-typescript";

@Table({
    tableName: "PipelineTemplates"
})
class PipelineTemplate extends Model<PipelineTemplate> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @Column
    name: string;

    @Column
    segment: string;

    @Default(false)
    @Column
    isDefault: boolean;

    @Default([])
    @Column(DataType.JSONB)
    stages: any[]; // Array of stage objects: { name: string, color: string, probability: number, order: number }

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default PipelineTemplate;
