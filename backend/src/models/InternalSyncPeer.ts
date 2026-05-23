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

@Table({ tableName: "InternalSyncPeers" })
class InternalSyncPeer extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  serverName: string;

  @Column
  publicId: string;

  @Column(DataType.TEXT)
  baseUrl: string;

  @Column
  secretRef: string;

  @Column(DataType.STRING)
  secretHash: string;

  @Default([])
  @Column(DataType.JSONB)
  allowedCompanyIds: number[];

  @Default([])
  @Column(DataType.JSONB)
  allowedWhatsappIds: number[];

  @Default([])
  @Column(DataType.JSONB)
  allowedNumbers: string[];

  @Default([])
  @Column(DataType.JSONB)
  allowedIpCidrs: string[];

  @Default("inactive")
  @Column
  status: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default InternalSyncPeer;
