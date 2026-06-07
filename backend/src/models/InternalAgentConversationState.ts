import {
    Table,
    Column,
    CreatedAt,
    UpdatedAt,
    Model,
    PrimaryKey,
    ForeignKey,
    BelongsTo,
    Default,
    DataType,
    AllowNull
} from "sequelize-typescript";
import Company from "./Company";
import Contact from "./Contact";
import Ticket from "./Ticket";
import Prompt from "./Prompt";

@Table({
    tableName: "InternalAgentConversationStates"
})
class InternalAgentConversationState extends Model<InternalAgentConversationState> {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id: string;

    @ForeignKey(() => Company)
    @AllowNull(false)
    @Column
    companyId: number;

    @BelongsTo(() => Company)
    company: Company;

    @ForeignKey(() => Contact)
    @AllowNull(false)
    @Column
    contactId: number;

    @BelongsTo(() => Contact)
    contact: Contact;

    @ForeignKey(() => Ticket)
    @AllowNull(true)
    @Column
    ticketId: number;

    @BelongsTo(() => Ticket)
    ticket: Ticket;

    @ForeignKey(() => Prompt)
    @AllowNull(true)
    @Column
    promptId: number;

    @BelongsTo(() => Prompt)
    prompt: Prompt;

    @Default("active")
    @Column(DataType.ENUM("active", "idle", "ended"))
    status: "active" | "idle" | "ended";

    @Default(0)
    @Column
    turnCount: number;

    @AllowNull(true)
    @Column(DataType.DATE)
    lastActivity: Date;

    @AllowNull(true)
    @Column(DataType.JSONB)
    metadata: object;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default InternalAgentConversationState;
