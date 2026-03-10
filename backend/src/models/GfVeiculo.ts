import {
  Table, Column, CreatedAt, UpdatedAt, Model,
  PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, DataType, Default
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";

@Table({ tableName: "GfVeiculos" })
class GfVeiculo extends Model<GfVeiculo> {
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
  marca: string;

  @Column
  modelo: string;

  @Column
  ano: string;

  @Column
  placa: string;

  @Column
  cor: string;

  @Column
  combustivel: string;

  @Column(DataType.DATEONLY)
  dataAquisicao: string;

  @Default(0)
  @Column
  quilometragem: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default GfVeiculo;
