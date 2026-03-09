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
  AllowNull
} from "sequelize-typescript";
import Company from "./Company";
import MySiteBoardCard from "./MySiteBoardCard";

@Table({
  tableName: "MySiteBoardChecklistItems"
})
class MySiteBoardChecklistItem extends Model<MySiteBoardChecklistItem> {
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

  @ForeignKey(() => MySiteBoardCard)
  @AllowNull(false)
  @Column
  cardId: number;

  @BelongsTo(() => MySiteBoardCard)
  card: MySiteBoardCard;

  @AllowNull(false)
  @Column
  title: string;

  @AllowNull(false)
  @Column({ defaultValue: false })
  completed: boolean;

  @AllowNull(false)
  @Column({ defaultValue: 0 })
  order: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default MySiteBoardChecklistItem;

