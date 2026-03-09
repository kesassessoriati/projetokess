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
import GroupDirectory from "./GroupDirectory";
import Company from "./Company";

@Table({ tableName: "GroupMembers" })
class GroupMember extends Model<GroupMember> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => GroupDirectory)
  @Column
  groupId: number;

  @BelongsTo(() => GroupDirectory)
  group: GroupDirectory;

  @Column(DataType.STRING)
  memberJid: string;

  @Default(false)
  @Column
  isAdmin: boolean;

  @Default(false)
  @Column
  isSuperAdmin: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default GroupMember;
