import {
  Table, Column, CreatedAt, UpdatedAt, Model,
  PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, DataType, Default
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";
import GfCategoriaMercado from "./GfCategoriaMercado";

@Table({ tableName: "GfItensMercado" })
class GfItemMercado extends Model<GfItemMercado> {
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

  @ForeignKey(() => GfCategoriaMercado)
  @Column({ field: "categoriaMercadoId" })
  categoriaMercadoId: number;

  @BelongsTo(() => GfCategoriaMercado)
  categoriaMercado: GfCategoriaMercado;

  @Column(DataType.TEXT)
  descricao: string;

  @Default("unidade")
  @Column
  unidadeMedida: string;

  @Default(0)
  @Column(DataType.DECIMAL(10, 3))
  quantidadeAtual: number;

  @Default(1)
  @Column(DataType.DECIMAL(10, 3))
  quantidadeIdeal: number;

  @Default(0)
  @Column(DataType.DECIMAL(12, 2))
  precoAtual: number;

  @Default("estoque_baixo")
  @Column(DataType.ENUM("estoque_adequado", "estoque_medio", "estoque_baixo", "sem_estoque"))
  status: "estoque_adequado" | "estoque_medio" | "estoque_baixo" | "sem_estoque";

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default GfItemMercado;
