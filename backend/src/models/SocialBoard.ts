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
import SocialStage from "./SocialStage";
import SocialContent from "./SocialContent";

@Table({
  tableName: "SocialBoards"
})
class SocialBoard extends Model<SocialBoard> {
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

  @AllowNull(true)
  @Column(DataType.TEXT)
  description: string;

  @AllowNull(true)
  @Column
  color: string;

  @AllowNull(true)
  @Column
  relatedType: string;

  @AllowNull(true)
  @Column
  relatedId: number;

  @AllowNull(true)
  @Column
  relatedName: string;

  @HasMany(() => SocialStage)
  stages: SocialStage[];

  @HasMany(() => SocialContent)
  contents: SocialContent[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default SocialBoard;

