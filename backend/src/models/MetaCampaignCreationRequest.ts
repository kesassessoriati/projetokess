import {
  Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey, DataType, Default,
  ForeignKey, BelongsTo
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";
import MetaAdAccount from "./MetaAdAccount";

@Table({ tableName: "MetaCampaignCreationRequests" })
class MetaCampaignCreationRequest extends Model<MetaCampaignCreationRequest> {
  @PrimaryKey @Default(DataType.UUIDV4) @Column({ type: DataType.UUID }) id: string;
  @ForeignKey(() => Company) @Column({ allowNull: false }) companyId: number;
  @BelongsTo(() => Company) company: Company;
  @ForeignKey(() => MetaAdAccount) @Column({ allowNull: false }) adAccountId: number;
  @BelongsTo(() => MetaAdAccount) adAccount: MetaAdAccount;
  @ForeignKey(() => User) @Column({ allowNull: false }) requestedByUserId: number;
  @BelongsTo(() => User, { foreignKey: "requestedByUserId" }) requestedByUser: User;
  @Column({ type: DataType.STRING(32), allowNull: false }) templateVersion: string;
  @Column({ type: DataType.UUID, allowNull: false }) idempotencyKey: string;
  @Column({ type: DataType.STRING(128), allowNull: false }) payloadHash: string;
  @Column({ type: DataType.JSONB, allowNull: false }) payload: object;
  @Default("requested") @Column({ type: DataType.STRING(32), allowNull: false }) status: string;
  @Column({ type: DataType.STRING(64), allowNull: false }) idempotencyMarker: string;
  @Column({ type: DataType.STRING(64), allowNull: true }) externalCampaignId: string;
  @Column({ type: DataType.STRING(64), allowNull: true }) externalAdSetId: string;
  @Column({ type: DataType.STRING(64), allowNull: true }) externalAdId: string;
  @Column({ type: DataType.STRING(96), allowNull: true }) errorCode: string;
  @Column({ type: DataType.STRING(64), allowNull: true }) executionLeaseToken: string;
  @Column({ type: DataType.DATE, allowNull: true }) executionLeaseExpiresAt: Date;
  @CreatedAt createdAt: Date;
  @UpdatedAt updatedAt: Date;
}

export default MetaCampaignCreationRequest;
