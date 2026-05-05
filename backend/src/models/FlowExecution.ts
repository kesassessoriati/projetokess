import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Default,
  AllowNull
} from "sequelize-typescript";
import Company from "./Company";
import { FlowBuilderModel } from "./FlowBuilder";
import Ticket from "./Ticket";

@Table({ tableName: "FlowExecutions" })
class FlowExecution extends Model<FlowExecution> {
  @Column
  companyId: number;

  @ForeignKey(() => FlowBuilderModel)
  @Column
  flowId: number;

  @BelongsTo(() => FlowBuilderModel, "flowId")
  flow: FlowBuilderModel;

  @ForeignKey(() => Ticket)
  @AllowNull(true)
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket, "ticketId")
  ticket: Ticket;

  @AllowNull(true)
  @Column
  contactNumber: string;

  @Default("campaign")
  @Column
  trigger: string; // campaign | welcome | notPhrase | webhook

  @AllowNull(true)
  @Column
  triggerPhrase: string;

  @Default("started")
  @Column
  status: string; // started | completed | stopped | error

  @AllowNull(true)
  @Column
  stoppedReason: string;

  @AllowNull(true)
  @Column
  lastNodeId: string;

  @AllowNull(true)
  @Column
  lastNodeType: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  errorMessage: string;

  @Default(0)
  @Column
  nodesExecuted: number;

  @AllowNull(true)
  @Column(DataType.JSON)
  nodePath: any[];

  @AllowNull(true)
  @Column
  durationMs: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default FlowExecution;
