import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Unique,
  Default
} from "sequelize-typescript";

@Table
class Plan extends Model<Plan> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Unique
  @Column
  name: string;

  @Column
  users: number;

  @Column
  connections: number;

  @Column
  queues: number;

  @Column
  amount: string;   

  @Column
  useWhatsapp: boolean;   

  @Column
  useFacebook: boolean;   

  @Column
  useInstagram: boolean;   
  
  @Column
  useCampaigns: boolean;   

  @Column
  useSchedules: boolean;   

  @Column
  useInternalChat: boolean;   
  
  @Column
  useExternalApi: boolean;   

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @Column
  useKanban: boolean;

  @Column
  trial: boolean;

  @Column
  trialDays: number;

  @Column
  recurrence: string;

  @Column
  useOpenAi: boolean;

  @Column
  useIntegrations: boolean;

  @Default(false)
  @Column
  notifica_mehub: boolean;

  @Default(false)
  @Column
  whatsapp_whatsmeow: boolean;

  @Default(false)
  @Column
  whatsapp_whaleys: boolean;

  @Default(false)
  @Column
  email: boolean;

  @Default(false)
  @Column
  gestor_financas: boolean;

  @Default(false)
  @Column
  gestor_financeiro_ia: boolean;

  @Default(true)
  @Column
  isPublic: boolean;

  @Default(0)
  @Column
  aiCredits: number;

  @Default(false)
  @Column
  aiEnabled: boolean;

  @Default(0)
  @Column
  aiDailyCredits: number;

  @Default(false)
  @Column
  aiAgentEnabled: boolean;

  @Default(false)
  @Column
  useMeetings: boolean;

  @Default(false)
  @Column
  useFirecrawl: boolean;
}

export default Plan;
