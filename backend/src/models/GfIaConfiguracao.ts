import {
  Table, Column, CreatedAt, UpdatedAt, Model,
  PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, DataType, Default
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";

@Table({ tableName: "GfIaConfiguracoes" })
class GfIaConfiguracao extends Model<GfIaConfiguracao> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column({ field: "companyId" })
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => User)
  @Column({ field: "userId" })
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @Column(DataType.TEXT)
  apiKey: string;

  @Default("gpt-4o")
  @Column
  modelo: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default GfIaConfiguracao;
