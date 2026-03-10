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
import CrmLead from "./CrmLead";

@Table({
  tableName: "lead_tags"
})
class LeadTag extends Model<LeadTag> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => CrmLead)
  @Column({ field: "lead_id" })
  leadId: number;

  @ForeignKey(() => Tag)
  @Column({ field: "tag_id" })
  tagId: number;

  @BelongsTo(() => CrmLead)
  lead: CrmLead;

  @BelongsTo(() => Tag)
  tag: Tag;

  @CreatedAt
  @Column({ field: "created_at" })
  createdAt: Date;

  @UpdatedAt
  @Column({ field: "updated_at" })
  updatedAt: Date;
}

export default LeadTag;
