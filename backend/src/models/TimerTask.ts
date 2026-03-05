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
    HasMany,
    Default
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";
import TimerSession from "./TimerSession";

@Table({
    tableName: "TimerTasks"
})
class TimerTask extends Model<TimerTask> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @Column
    name: string;

    @Default(10)
    @Column
    defaultTime: number;

    @Column
    category: string;

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

    @HasMany(() => TimerSession)
    sessions: TimerSession[];

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default TimerTask;
