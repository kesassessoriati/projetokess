import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  Default
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import Company from "./Company";

/**
 * Ledger de execução por ação das automações por etapa do pipeline.
 * Cada linha registra o desfecho de uma ação dentro de um ciclo de entrada
 * na etapa (cycleId), permitindo:
 *  - evitar reexecução da mesma ação (actionUid) no mesmo ciclo;
 *  - sinalizar parada do ciclo (status="stopped") para abortar ações posteriores;
 *  - auditoria executed/skipped/stopped/failed.
 */
@Table({ tableName: "StageAutomationExecutionLogs" })
class StageAutomationExecutionLog extends Model<StageAutomationExecutionLog> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => require("./Automation").default)
  @Column
  automationId: number;

  @Column
  actionUid: string;

  @Column
  cycleId: string;

  @Column
  opportunityId: number;

  @Column
  contactId: number;

  @Column
  ticketId: number;

  @Column
  stageId: number;

  // executed | skipped | stopped | failed
  @Column
  status: string;

  @Column(DataTypes.TEXT)
  reason: string;

  @Default({})
  @Column(DataTypes.JSONB)
  metadata: any;

  @Column
  executedAt: Date;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default StageAutomationExecutionLog;
