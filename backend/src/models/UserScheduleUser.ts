import {
    Table,
    Column,
    CreatedAt,
    UpdatedAt,
    Model,
    ForeignKey,
    PrimaryKey,
    AutoIncrement,
    BelongsTo
} from "sequelize-typescript";
import User from "./User";
import UserSchedule from "./UserSchedule";

@Table({ tableName: "user_schedule_users" })
class UserScheduleUser extends Model<UserScheduleUser> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => User)
    @Column({ field: "user_id" })
    userId: number;

    @BelongsTo(() => User)
    user: User;

    @ForeignKey(() => UserSchedule)
    @Column({ field: "user_schedule_id" })
    userScheduleId: number;

    @BelongsTo(() => UserSchedule)
    userSchedule: UserSchedule;

    @CreatedAt
    @Column({ field: "created_at" })
    createdAt: Date;

    @UpdatedAt
    @Column({ field: "updated_at" })
    updatedAt: Date;
}

export default UserScheduleUser;
