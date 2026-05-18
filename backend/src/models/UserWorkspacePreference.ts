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
  DataType
} from "sequelize-typescript";

import Company from "./Company";
import User from "./User";

@Table({
  tableName: "user_workspace_preferences"
})
class UserWorkspacePreference extends Model<UserWorkspacePreference> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column({ field: "company_id" })
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => User)
  @Column({ field: "user_id" })
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @Column({ field: "menu_key" })
  menuKey: string;

  @Column({ type: DataType.BOOLEAN })
  visible: boolean;

  @CreatedAt
  @Column({ field: "created_at" })
  createdAt: Date;

  @UpdatedAt
  @Column({ field: "updated_at" })
  updatedAt: Date;
}

export default UserWorkspacePreference;
