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

    @Column({ field: "runtime_plan", type: DataType.JSONB })
    runtimePlan: any;

    @Column({ field: "runtime_plan_version" })
    runtimePlanVersion: number;

    @Column({ field: "runtime_plan_compiler_version" })
    runtimePlanCompilerVersion: string;

    @Column({ field: "runtime_plan_source_hash" })
    runtimePlanSourceHash: string;

    @Column({
        field: "runtime_plan_status",
        type: DataType.ENUM("STALE", "VALID", "PARTIAL", "INVALID"),
        defaultValue: "STALE"
    })
    runtimePlanStatus: string;

    @Column({ field: "runtime_plan_diagnostics", type: DataType.JSONB, defaultValue: [] })
    runtimePlanDiagnostics: any[];

    @Column({ field: "last_compiled_at" })
    lastCompiledAt: Date;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default KanbanAutomation;
