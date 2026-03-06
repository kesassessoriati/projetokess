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
    DataType,
} from "sequelize-typescript";

import TaskList from "./TaskList";
import User from "./User";
import TaskChecklist from "./TaskChecklist";
import TaskComment from "./TaskComment";

@Table({
    tableName: "Tasks",
})
class Task extends Model<Task> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => TaskList)
    @Column
    listId: number;

    @BelongsTo(() => TaskList)
    list: TaskList;

    @AllowNull(false)
    @Column
    title: string;

    @AllowNull(true)
    @Column({ type: DataType.TEXT })
    description: string;

    @AllowNull(true)
    @Column
    priority: string;

    @AllowNull(true)
    @Column
    dueDate: Date;

    @ForeignKey(() => User)
    @Column
    responsibleId: number;

    @BelongsTo(() => User)
    responsible: User;

    @AllowNull(true)
    @Column
    color: string;

    @AllowNull(true)
    @Column
    url: string;

    @AllowNull(true)
    @Column({ type: DataType.JSON })
    tags: string[];

    @AllowNull(false)
    @Column({ defaultValue: 0 })
    order: number;

    @HasMany(() => TaskChecklist)
    checklists: TaskChecklist[];

    @HasMany(() => TaskComment)
    comments: TaskComment[];

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default Task;
