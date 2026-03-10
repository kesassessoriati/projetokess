import {
  Table, Column, CreatedAt, UpdatedAt, Model,
  PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, DataType, Default
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";
import GfVeiculo from "./GfVeiculo";
import GfTipoManutencao from "./GfTipoManutencao";

@Table({ tableName: "GfManutencoes" })
class GfManutencao extends Model<GfManutencao> {
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

  @ForeignKey(() => GfVeiculo)
  @Column({ field: "veiculoId" })
  veiculoId: number;

  @BelongsTo(() => GfVeiculo)
  veiculo: GfVeiculo;

  @ForeignKey(() => GfTipoManutencao)
  @Column({ field: "tipoManutencaoId" })
  tipoManutencaoId: number;

  @BelongsTo(() => GfTipoManutencao)
  tipoManutencao: GfTipoManutencao;

  @Column
  quilometragemRealizada: number;

  @Column(DataType.DATEONLY)
  dataRealizada: string;

  @Column(DataType.DATEONLY)
  dataProxima: string;

  @Column
  quilometragemProxima: number;

  @Default("pendente")
  @Column
  status: string;

  @Column(DataType.TEXT)
  observacoes: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default GfManutencao;
