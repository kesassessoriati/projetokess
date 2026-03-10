import {
  Table, Column, CreatedAt, UpdatedAt, Model,
  PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, DataType, Default
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";
import GfCategoriaMeta from "./GfCategoriaMeta";

@Table({ tableName: "GfMetas" })
class GfMeta extends Model<GfMeta> {
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

  @ForeignKey(() => GfCategoriaMeta)
  @Column({ field: "categoriaMetaId" })
  categoriaMetaId: number;

  @BelongsTo(() => GfCategoriaMeta)
  categoriaMeta: GfCategoriaMeta;

  @Column
  titulo: string;

  @Column(DataType.ENUM("economia", "receita", "despesa", "investimento"))
  tipo: "economia" | "receita" | "despesa" | "investimento";

  @Column(DataType.DECIMAL(12, 2))
  valorAlvo: number;

  @Default(0)
  @Column(DataType.DECIMAL(12, 2))
  valorAtual: number;

  @Column(DataType.DATEONLY)
  dataInicio: string;

  @Column(DataType.DATEONLY)
  dataLimite: string;

  @Default("ativa")
  @Column(DataType.ENUM("ativa", "concluida", "pausada", "vencida"))
  status: "ativa" | "concluida" | "pausada" | "vencida";

  @Column(DataType.TEXT)
  descricao: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default GfMeta;
