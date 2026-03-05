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
    Default,
    DataType
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";
import TimerTask from "./TimerTask";
import Ticket from "./Ticket";

@Table({
    tableName: "TimerSessions"
})
class TimerSession extends Model<TimerSession> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => TimerTask)
    @Column
    taskId: number;

    @BelongsTo(() => TimerTask)
    task: TimerTask;

    @ForeignKey(() => User)
    @Column
    userId: number;

    @BelongsTo(() => User)
    user: User;

    @ForeignKey(() => Company)
    @Column
    companyId: number;

    @BelongsTo(() => Company)
    company: Company;

    @ForeignKey(() => Ticket)
    @Column
    ticketId: number;

    @BelongsTo(() => Ticket)
    ticket: Ticket;

    @Column
    startTime: Date;

    @Column
    endTime: Date;

    @Default(0)
    @Column(DataType.INTEGER)
    timeSpent: number; // in seconds

    @Default("active")
    @Column(DataType.STRING)
    status: string; // active, paused, completed

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default TimerSession;
