// @ts-nocheck
import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  PrimaryKey,
  AutoIncrement
} from "sequelize-typescript";
import Company from "./Company";

@Table({
  tableName: "Produtos"
})
class Produto extends Model<Produto> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Column(DataType.STRING(20))
  tipo: string;

  @Column(DataType.STRING(255))
  nome: string;

  @Column(DataType.TEXT)
  descricao: string | null;

  @Column(DataType.DECIMAL(12, 2))
  valor: number;

  @Column({ type: DataType.STRING(20), defaultValue: "disponivel" })
  status: string;

  @Column(DataType.TEXT)
  imagem_principal: string | null;

  @Column(DataType.JSONB)
  galeria: any | null;

  @Column(DataType.JSONB)
  dados_especificos: any | null;
}

export default Produto;
