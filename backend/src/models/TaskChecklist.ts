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
} from "sequelize-typescript";

import Task from "./Task";

@Table({
    tableName: "TaskChecklists",
})
class TaskChecklist extends Model<TaskChecklist> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => Task)
    @Column
    taskId: number;

    @BelongsTo(() => Task)
    task: Task;

    @AllowNull(false)
    @Column
    title: string;

    @AllowNull(false)
    @Column({ defaultValue: false })
    completed: boolean;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default TaskChecklist;
