import {
  Table, Column, CreatedAt, UpdatedAt, Model,
  PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, DataType
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";

@Table({ tableName: "GfTiposManutencao" })
class GfTipoManutencao extends Model<GfTipoManutencao> {
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

  @Column
  sistema: string;

  @Column
  intervaloKm: number;

  @Column(DataType.TEXT)
  descricao: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default GfTipoManutencao;
