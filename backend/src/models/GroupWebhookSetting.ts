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
  Default
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import Company from "./Company";
import User from "./User";

/**
 * Configuração de webhook por grupo (Gestão de Grupos → Webhook).
 * Multi-tenant: sempre filtrada por companyId. `selectedGroups` guarda ids de
 * GroupDirectory pertencentes à mesma empresa. `secret` (opcional) é usado só
 * para assinar o payload (HMAC) e nunca é enviado no corpo nem retornado cru.
 */
@Table({ tableName: "GroupWebhookSettings" })
class GroupWebhookSetting extends Model<GroupWebhookSetting> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Column
  name: string;

  @Column
  url: string;

  @Column
  secret: string;

  @Default([])
  @Column(DataTypes.JSONB)
  events: string[];

  @Default([])
  @Column(DataTypes.JSONB)
  selectedGroups: number[];

  @Default(true)
  @Column
  enabled: boolean;

  @ForeignKey(() => User)
  @Column
  createdByUserId: number;

  @BelongsTo(() => User)
  createdByUser: User;

  @Column
  lastStatus: string;

  @Column(DataTypes.TEXT)
  lastError: string;

  @Column(DataTypes.DATE)
  lastSentAt: Date;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default GroupWebhookSetting;
