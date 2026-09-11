import {
  Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey, AutoIncrement,
  DataType, Default, ForeignKey, BelongsTo
} from "sequelize-typescript";
import Company from "./Company";
import MetaAdAccount from "./MetaAdAccount";

@Table({ tableName: "MetaSyncRuns" })
class MetaSyncRun extends Model<MetaSyncRun> {
  @PrimaryKey @AutoIncrement @Column id: number;
  @ForeignKey(() => Company) @Column({ allowNull: false }) companyId: number;
  @BelongsTo(() => Company) company: Company;
  @ForeignKey(() => MetaAdAccount) @Column({ allowNull: false }) adAccountId: number;
  @BelongsTo(() => MetaAdAccount) adAccount: MetaAdAccount;
  @Column({ type: DataType.DATEONLY, allowNull: false }) periodStart: string;
  @Column({ type: DataType.DATEONLY, allowNull: false }) periodEnd: string;
  @Default("running") @Column({ type: DataType.STRING(32), allowNull: false }) status: string;
  @Default(1) @Column({ type: DataType.INTEGER, allowNull: false }) attempt: number;
  @Column({ type: DataType.STRING(96), allowNull: true }) errorCode: string;
  @Column({ type: DataType.DATE, allowNull: false }) startedAt: Date;
  @Column({ type: DataType.DATE, allowNull: true }) finishedAt: Date;
  @CreatedAt createdAt: Date;
  @UpdatedAt updatedAt: Date;
}

export default MetaSyncRun;
