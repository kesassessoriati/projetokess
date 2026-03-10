import {
  Table, Column, CreatedAt, UpdatedAt, Model,
  PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, DataType, Default, HasMany
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";

@Table({ tableName: "GfCategorias" })
class GfCategoria extends Model<GfCategoria> {
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

  @Column(DataType.ENUM("receita", "despesa"))
  tipo: "receita" | "despesa";

  @Default("#3B82F6")
  @Column
  cor: string;

  @Default("DollarSign")
  @Column
  icone: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default GfCategoria;
