import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  DataType,
  Default
} from "sequelize-typescript";

@Table({ tableName: "InternalMessageSyncEvents" })
class InternalMessageSyncEvent extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  wid: string;

  @Column
  sourceServerId: string;

  @Column
  targetServerId: string;

  @Column
  sourceCompanyId: number;

  @Column
  targetCompanyId: number;

  @Column
  sourceWhatsappId: number;

  @Column
  targetWhatsappId: number;

  @Column
  sourceRemoteJid: string;

  @Column
  targetRemoteJid: string;

  @Column
  messageType: string;

  @Column
  direction: string;

  @Default("pending")
  @Column
  status: string;

  @Default(0)
  @Column
  attempts: number;

  @Column(DataType.TEXT)
  lastError: string;

  @Column
  payloadHash: string;

  @Column
  nonce: string;

  @Column(DataType.DATE)
  receivedAt: Date;

  @Column(DataType.DATE)
  processedAt: Date;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default InternalMessageSyncEvent;
