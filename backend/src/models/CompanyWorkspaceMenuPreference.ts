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
  DataType,
  Default
} from "sequelize-typescript";

import Company from "./Company";

@Table({
  tableName: "company_workspace_menu_preferences"
})
class CompanyWorkspaceMenuPreference extends Model<CompanyWorkspaceMenuPreference> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column({ field: "company_id" })
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Column({ field: "menu_key" })
  menuKey: string;

  @Default(true)
  @Column({ type: DataType.BOOLEAN })
  visible: boolean;

  @CreatedAt
  @Column({ field: "created_at" })
  createdAt: Date;

  @UpdatedAt
  @Column({ field: "updated_at" })
  updatedAt: Date;
}

export default CompanyWorkspaceMenuPreference;
