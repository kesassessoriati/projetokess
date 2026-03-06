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
    AllowNull,
    DataType,
} from "sequelize-typescript";

import Task from "./Task";
import User from "./User";

@Table({
    tableName: "TaskComments",
})
class TaskComment extends Model<TaskComment> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => Task)
    @Column
    taskId: number;

    @BelongsTo(() => Task)
    task: Task;

    @ForeignKey(() => User)
    @Column
    userId: number;

    @BelongsTo(() => User)
    user: User;

    @AllowNull(false)
    @Column({ type: DataType.TEXT })
    message: string;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default TaskComment;
