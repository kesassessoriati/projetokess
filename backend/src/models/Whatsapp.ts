import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Default,
  AllowNull,
  HasMany,
  HasOne,
  Unique,
  BelongsToMany,
  ForeignKey,
  BelongsTo,
  BeforeSave,
  BeforeUpdate
} from "sequelize-typescript";
import { encrypt, decrypt } from "../helpers/crypto";
import Queue from "./Queue";
import Ticket from "./Ticket";
import WhatsappQueue from "./WhatsappQueue";
import Company from "./Company";
import QueueIntegrations from "./QueueIntegrations";
import Prompt from "./Prompt";
import { FlowBuilderModel } from "./FlowBuilder";
import WhatsappWarmup from "./WhatsappWarmup";
import Chip from "./Chip";

@Table
class Whatsapp extends Model<Whatsapp> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull
  @Unique
  @Column(DataType.TEXT)
  name: string;

  @Column(DataType.TEXT)
  session: string;

  @Column(DataType.TEXT)
  qrcode: string;

  @Column
  status: string;

  @Column
  battery: string;

  @Column
  plugged: boolean;

  @Column
  retries: number;

  @Column
  number: string;

  @Default("")
  @Column(DataType.TEXT)
  greetingMessage: string;

  @Column
  greetingMediaAttachment: string

  @Default("")
  @Column(DataType.TEXT)
  farewellMessage: string;

  @Default("")
  @Column(DataType.TEXT)
  complationMessage: string;

  @Default("")
  @Column(DataType.TEXT)
  outOfHoursMessage: string;

  @Column({ defaultValue: "stable" })
  provider: string;

  @Default(false)
  @AllowNull
  @Column
  isDefault: boolean;

  @Default(false)
  @AllowNull
  @Column
  allowGroup: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @HasMany(() => Ticket)
  tickets: Ticket[];

  @BelongsToMany(() => Queue, () => WhatsappQueue)
  queues: Array<Queue & { WhatsappQueue: WhatsappQueue }>;

  @HasMany(() => WhatsappQueue)
  whatsappQueues: WhatsappQueue[];

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Column
  token: string;

  @Column(DataType.TEXT)
  facebookUserId: string;

  @Column(DataType.TEXT)
  facebookUserToken: string;

  @Column(DataType.TEXT)
  facebookPageUserId: string;

  @Column(DataType.TEXT)
  tokenMeta: string;

  @Column(DataType.TEXT)
  channel: string;

  @Column(DataType.STRING)
  emailAddress: string;

  @Column(DataType.STRING)
  emailDisplayName: string;

  @Column(DataType.TEXT)
  emailSignature: string;

  @Default(true)
  @Column
  emailUseCompanySmtp: boolean;

  @Column(DataType.STRING)
  emailSmtpHost: string;

  @Column
  emailSmtpPort: number;

  @Default(false)
  @Column
  emailSmtpSecure: boolean;

  @Column(DataType.STRING)
  emailSmtpUser: string;

  @Column(DataType.STRING)
  get emailSmtpPassword(): string {
    const raw = this.getDataValue("emailSmtpPassword" as any);
    return raw ? decrypt(raw) : raw;
  }

  @Column(DataType.STRING)
  emailImapHost: string;

  @Column
  emailImapPort: number;

  @Default(true)
  @Column
  emailImapSecure: boolean;

  @Column(DataType.STRING)
  emailImapUser: string;

  @Column(DataType.STRING)
  get emailImapPassword(): string {
    const raw = this.getDataValue("emailImapPassword" as any);
    return raw ? decrypt(raw) : raw;
  }

  @Default(true)
  @Column
  emailSyncEnabled: boolean;

  @Column
  emailLastSyncAt: Date;

  @Column
  emailLastUid: number;

  @Column(DataType.TEXT)
  emailSyncError: string;

  @Column(DataType.JSONB)
  universalConfig: any;

  @Default(3)
  @Column
  maxUseBotQueues: number;

  @Default(0)
  @Column
  timeUseBotQueues: string;

  @AllowNull(true)
  @Default(0)
  @Column
  expiresTicket: string;

  @Default(0)
  @Column
  timeSendQueue: number;

  @ForeignKey(() => Queue)
  @Column
  sendIdQueue: number;

  @BelongsTo(() => Queue)
  queueSend: Queue;

  @Column
  timeInactiveMessage: string;

  @Column
  inactiveMessage: string;

  @Column
  ratingMessage: string;

  @Column
  maxUseBotQueuesNPS: number;

  @Column
  expiresTicketNPS: number;

  @Column
  whenExpiresTicket: string;

  @Column
  expiresInactiveMessage: string;

  @Default("disabled")
  @Column
  groupAsTicket: string;
  
  @Column
  importOldMessages: Date;

  @Column
  importRecentMessages: Date;

  @Column
  statusImportMessages: string;
  
  @Column
  closedTicketsPostImported:boolean;

  @Column
  importOldMessagesGroups:boolean;

  @Column
  timeCreateNewTicket: number;

  @ForeignKey(() => QueueIntegrations)
  @Column
  integrationId: number;

  @BelongsTo(() => QueueIntegrations)
  queueIntegrations: QueueIntegrations;

  @ForeignKey(() => QueueIntegrations)
  @Column
  messageIntegrationId: number;

  @BelongsTo(() => QueueIntegrations, {
    foreignKey: "messageIntegrationId",
    as: "messageIntegration"
  })
  messageIntegration: QueueIntegrations;

  @Column({
    type: DataType.JSONB
  })
  schedules: [];

  @ForeignKey(() => Prompt)
  @Column
  promptId: number;

  @BelongsTo(() => Prompt)
  prompt: Prompt;

  @Column
  collectiveVacationMessage: string;

  @Column
  collectiveVacationStart: string;

  @Column
  collectiveVacationEnd: string;

  @ForeignKey(() => Queue)
  @Column
  queueIdImportMessages: number;

  @BelongsTo(() => Queue)
  queueImport: Queue;

  @ForeignKey(() => FlowBuilderModel)
  @Column
  flowIdNotPhrase: number;

  @ForeignKey(() => FlowBuilderModel)
  @Column
  flowIdWelcome: number;

  @BelongsTo(() => FlowBuilderModel)
  flowBuilder: FlowBuilderModel
  
  // Adicionando a coluna wavoip
  @Column(DataType.TEXT)
  wavoip: string;

  @Column
  notificameHub: boolean;

  @Default(false)
  @Column
  coexistenceEnabled: boolean;

  @Default(false)
  @Column
  businessAppConnected: boolean;

  @Default("automatic")
  @Column
  messageRoutingMode: string;

  @Column(DataType.JSONB)
  routingRules: any[] | null;

  @Column
  lastCoexistenceSync: Date;

  @Column(DataType.TEXT)
  coexistencePhoneNumberId: string;

  @Column(DataType.TEXT)
  coexistenceWabaId: string;

  @Column(DataType.TEXT)
  coexistencePermanentToken: string;

  @HasOne(() => WhatsappWarmup, { foreignKey: "whatsappId" })
  warmup: WhatsappWarmup;

  @HasMany(() => Chip, { foreignKey: "whatsappId" })
  chips: Chip[];

  @BeforeSave
  @BeforeUpdate
  static encryptEmailPasswords(instance: Whatsapp) {
    if (instance.changed("emailSmtpPassword" as any)) {
      const plain = instance.getDataValue("emailSmtpPassword" as any);
      if (plain) instance.setDataValue("emailSmtpPassword" as any, encrypt(plain));
    }
    if (instance.changed("emailImapPassword" as any)) {
      const plain = instance.getDataValue("emailImapPassword" as any);
      if (plain) instance.setDataValue("emailImapPassword" as any, encrypt(plain));
    }
  }
}

export default Whatsapp;
