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
import Automation from "./Automation";

@Table({ tableName: "AutomationActions" })
class AutomationAction extends Model<AutomationAction> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Automation)
  @Column
  automationId: number;

  @BelongsTo(() => Automation)
  automation: Automation;

  @Column
  actionType: string;

  @Column
  actionUid: string;

  @Default({})
  @Column(DataTypes.JSONB)
  actionConfig: any;

  @Column(DataTypes.JSONB)
  condition: any;

  @Column(DataTypes.JSONB)
  flowControl: any;

  @Default(1)
  @Column
  order: number;

  @Default(0)
  @Column
  delayMinutes: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AutomationAction;
