import {
  Table, Column, CreatedAt, UpdatedAt, Model,
  PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, DataType, Default
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";
import GfIaUpload from "./GfIaUpload";

@Table({ tableName: "GfIaAnalysisResults" })
class GfIaAnalysisResult extends Model<GfIaAnalysisResult> {
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

  @ForeignKey(() => GfIaUpload)
  @Column({ field: "uploadId" })
  uploadId: number;

  @BelongsTo(() => GfIaUpload)
  upload: GfIaUpload;

  @Column
  fileName: string;

  @Column(DataType.ENUM("receita", "despesa"))
  tipo: "receita" | "despesa";

  @Column(DataType.TEXT)
  descricao: string;

  @Column(DataType.DECIMAL(12, 2))
  valor: number;

  @Column
  categoria: string;

  @Column(DataType.DATEONLY)
  data: string;

  @Column
  confianca: number;

  @Default("pending")
  @Column(DataType.ENUM("pending", "approved", "rejected"))
  status: "pending" | "approved" | "rejected";

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default GfIaAnalysisResult;
