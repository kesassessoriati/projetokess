import {
  Table, Column, CreatedAt, UpdatedAt, Model,
  PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, DataType
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";
import GfCategoria from "./GfCategoria";

@Table({ tableName: "GfReceitas" })
class GfReceita extends Model<GfReceita> {
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
  valor: number;

  @Column(DataType.DATEONLY)
  data: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default GfReceita;
