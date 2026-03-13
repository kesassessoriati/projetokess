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
  HasMany,
  AllowNull,
  Default,
  DataType,
} from "sequelize-typescript";
import Company from "./Company";
import FollowUpCampaign from "./FollowUpCampaign";

@Table({ tableName: "FollowUpBoards" })
class FollowUpBoard extends Model<FollowUpBoard> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(false)
  @Default("Geral")
  @Column(DataType.STRING)
  funnelName: string;

  @AllowNull(false)
  @Default(["Sem Categoria"])
  @Column(DataType.JSON)
  columns: string[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsTo(() => Company)
  company: Company;

  @HasMany(() => FollowUpCampaign, { foreignKey: "boardId" })
  campaigns: FollowUpCampaign[];
}

export default FollowUpBoard;
