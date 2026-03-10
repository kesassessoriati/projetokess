import {
  Table, Column, CreatedAt, UpdatedAt, Model,
  PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, DataType, Default
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";

@Table({ tableName: "GfOrcamentosMercado" })
class GfOrcamentoMercado extends Model<GfOrcamentoMercado> {
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

  @Default("Alimentação")
  @Column
  categoriaDespesa: string;

  @Default(0)
  @Column(DataType.DECIMAL(12, 2))
  valorOrcamento: number;

  @Default(0)
  @Column(DataType.DECIMAL(12, 2))
  estimativaGastos: number;

  @Column(DataType.DATEONLY)
  mesReferencia: string;

  @Default(true)
  @Column
  ativo: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default GfOrcamentoMercado;
