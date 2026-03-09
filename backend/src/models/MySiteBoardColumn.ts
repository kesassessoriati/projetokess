import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  HasMany,
  AllowNull,
  DataType
} from "sequelize-typescript";
import Company from "./Company";
import MySiteBoardCard from "./MySiteBoardCard";

@Table({
  tableName: "MySiteBoardColumns"
})
class MySiteBoardColumn extends Model<MySiteBoardColumn> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @AllowNull(false)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(false)
  @Column({ defaultValue: 0 })
  order: number;

  @AllowNull(true)
  @Column
  color: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  description: string;

  @HasMany(() => MySiteBoardCard)
  cards: MySiteBoardCard[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default MySiteBoardColumn;

