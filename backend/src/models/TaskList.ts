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
    AllowNull,
} from "sequelize-typescript";

import TaskBoard from "./TaskBoard";
import Task from "./Task";

@Table({
    tableName: "TaskLists",
})
class TaskList extends Model<TaskList> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => TaskBoard)
    @Column
    boardId: number;

    @BelongsTo(() => TaskBoard)
    board: TaskBoard;

    @AllowNull(false)
    @Column
    name: string;

    @AllowNull(false)
    @Column({ defaultValue: 0 })
    order: number;

    @AllowNull(true)
    @Column
    color: string;

    @HasMany(() => Task)
    tasks: Task[];

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default TaskList;
