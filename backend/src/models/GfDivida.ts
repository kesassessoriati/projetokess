import {
  Table, Column, CreatedAt, UpdatedAt, Model,
  PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, DataType, Default
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";
import GfCategoria from "./GfCategoria";

@Table({ tableName: "GfDividas" })
class GfDivida extends Model<GfDivida> {
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

  @ForeignKey(() => GfCategoria)
  @Column({ field: "categoriaId" })
  categoriaId: number;

  @BelongsTo(() => GfCategoria)
  categoria: GfCategoria;

  @Column(DataType.TEXT)
  descricao: string;

  @Column(DataType.DECIMAL(12, 2))
  valorTotal: number;

  @Default(0)
  @Column(DataType.DECIMAL(12, 2))
  valorPago: number;

  @Column(DataType.DECIMAL(12, 2))
  valorRestante: number;

  @Column(DataType.DATEONLY)
  dataVencimento: string;

  @Default(1)
  @Column
  parcelas: number;

  @Default(0)
  @Column
  parcelasPagas: number;

  @Default("pendente")
  @Column(DataType.ENUM("pendente", "vencida", "quitada"))
  status: "pendente" | "vencida" | "quitada";

  @Column
  credor: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default GfDivida;
