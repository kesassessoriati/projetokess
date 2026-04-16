import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  ForeignKey,
  BelongsTo,
  PrimaryKey,
  AutoIncrement
} from "sequelize-typescript";
import Tag from "./Tag";
import CrmClient from "./CrmClient";

@Table({
  tableName: "crm_client_tags"
})
class CrmClientTag extends Model<CrmClientTag> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => CrmClient)
  @Column({ field: "client_id" })
  clientId: number;

  @ForeignKey(() => Tag)
  @Column({ field: "tag_id" })
  tagId: number;

  @BelongsTo(() => CrmClient)
  client: CrmClient;

  @BelongsTo(() => Tag)
  tag: Tag;

  @CreatedAt
  @Column({ field: "created_at" })
  createdAt: Date;

  @UpdatedAt
  @Column({ field: "updated_at" })
  updatedAt: Date;
}

export default CrmClientTag;
