import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  DataType,
  Default,
  ForeignKey
} from "sequelize-typescript";
import InternalSyncPeer from "./InternalSyncPeer";

@Table({ tableName: "InternalSyncRoutes" })
class InternalSyncRoute extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @Column
  localServerId: string;

  @ForeignKey(() => InternalSyncPeer)
  @Column
  remotePeerId: number;

  @Column
  localCompanyId: number;

  @Column
  localWhatsappId: number;

  @Column
  localNumber: string;

  @Column
  localRemoteJid: string;

  @Column
  remoteServerId: string;

  @Column
  remoteCompanyId: number;

  @Column
  remoteWhatsappId: number;

  @Column
  remoteNumber: string;

  @Column
  remoteJid: string;

  @Default("bidirectional")
  @Column
  direction: string;

  @Default("active")
  @Column
  status: string;

  @Default(["text"])
  @Column(DataType.JSONB)
  allowedMessageTypes: string[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default InternalSyncRoute;
