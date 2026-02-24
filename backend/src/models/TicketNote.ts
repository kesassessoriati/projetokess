import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  AutoIncrement,
  AllowNull,
  Default,
  DataType
} from "sequelize-typescript";

import Contact from "./Contact";
import User from "./User";
import Ticket from "./Ticket";
import Company from "./Company";

@Table({ tableName: "TicketNotes" })
class TicketNote extends Model<TicketNote> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column(DataType.TEXT)
  note: string;

  // ─── isPrivate: distingue nota privada de observação pública ───────────
  // true  = nota privada (visível apenas para a equipe interna)
  // false = observação pública / legado
  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  isPrivate: boolean;

  // ─── Relação com User (quem criou a nota) ──────────────────────────────
  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  // ─── Relação com Contact ───────────────────────────────────────────────
  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

  // ─── Relação com Ticket ────────────────────────────────────────────────
  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  // ─── companyId: isolamento multi-tenant obrigatório ───────────────────
  // O hook tenantIsolation.ts filtrará automaticamente via beforeFind
  @ForeignKey(() => Company)
  @AllowNull(false)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default TicketNote;
