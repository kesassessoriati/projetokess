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
    tableName: "InternalAgentMemories"
})
class InternalAgentMemory extends Model<InternalAgentMemory> {
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

    @ForeignKey(() => Prompt)
    @AllowNull(true)
    @Column
    promptId: number;

    @BelongsTo(() => Prompt)
    prompt: Prompt;

    @ForeignKey(() => Ticket)
    @AllowNull(true)
    @Column
    sourceTicketId: number;

    @BelongsTo(() => Ticket, { foreignKey: "sourceTicketId" })
    sourceTicket: Ticket;

    @Default("summary")
    @Column(DataType.ENUM("summary", "preference", "fact", "goal"))
    memoryType: "summary" | "preference" | "fact" | "goal";

    @AllowNull(false)
    @Column(DataType.TEXT)
    content: string;

    @Default(1.0)
    @Column(DataType.FLOAT)
    relevanceScore: number;

    @AllowNull(true)
    @Column(DataType.DATE)
    expiresAt: Date;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default InternalAgentMemory;
