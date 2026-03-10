import {
  Table, Column, CreatedAt, UpdatedAt, Model,
  PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, DataType
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";

@Table({ tableName: "GfProfiles" })
class GfProfile extends Model<GfProfile> {
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
  name: string;

  @Column
  organizationName: string;

  @Column
  telefone: string;

  @Column(DataType.TEXT)
  endereco: string;

  @Column(DataType.TEXT)
  avatarUrl: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default GfProfile;
