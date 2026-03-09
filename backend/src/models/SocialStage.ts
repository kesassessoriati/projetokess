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
  AllowNull
} from "sequelize-typescript";

import Company from "./Company";
import SocialBoard from "./SocialBoard";
import SocialContent from "./SocialContent";

@Table({
  tableName: "SocialStages"
})
class SocialStage extends Model<SocialStage> {
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

  @ForeignKey(() => SocialBoard)
  @AllowNull(false)
  @Column
  boardId: number;

  @BelongsTo(() => SocialBoard)
  board: SocialBoard;

  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(false)
  @Column({ defaultValue: 0 })
  order: number;

  @AllowNull(true)
  @Column
  color: string;

  @HasMany(() => SocialContent)
  contents: SocialContent[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default SocialStage;

