import {
    Table,
    Column,
    CreatedAt,
    UpdatedAt,
    Model,
    PrimaryKey,
    AutoIncrement,
    DataType,
    BelongsTo,
    ForeignKey,
} from "sequelize-typescript";
import User from "./User";
import Company from "./Company";

@Table({
    tableName: "kanban_automations"
})
class KanbanAutomation extends Model<KanbanAutomation> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => User)
    @Column
    user_id: number;

    @BelongsTo(() => User)
    user: User;

    @ForeignKey(() => Company)
    @Column
    company_id: number;

    @BelongsTo(() => Company)
    company: Company;

    @Column
    nome_automacao: string;

    @Column(DataType.JSON)
    estrutura_fluxo: any;

    @Column({ defaultValue: true })
    status: boolean;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default KanbanAutomation;
