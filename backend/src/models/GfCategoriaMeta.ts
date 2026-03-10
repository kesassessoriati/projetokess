import {
  Table, Column, CreatedAt, UpdatedAt, Model,
  PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, DataType, Default, HasMany
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";

@Table({ tableName: "GfCategoriasMetas" })
class GfCategoriaMeta extends Model<GfCategoriaMeta> {
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

  @Column
  nome: string;

  @Default("#10B981")
  @Column
  cor: string;

  @Column(DataType.TEXT)
  descricao: string;

  @Default(true)
  @Column
  ativa: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default GfCategoriaMeta;
