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

import Company from "./Company";
import TaskList from "./TaskList";
import User from "./User";

@Table({
    tableName: "TaskBoards",
})
class TaskBoard extends Model<TaskBoard> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => Company)
    @Column
    companyId: number;

    @BelongsTo(() => Company)
    company: Company;

    @AllowNull(false)
    @Column
    name: string;

    @AllowNull(true)
    @Column({ type: DataType.TEXT })
    description: string;

    @AllowNull(true)
    @Column
    color: string;

    @ForeignKey(() => User)
    @AllowNull(true)
    @Column
    createdBy: number;

    @BelongsTo(() => User, "createdBy")
    creator: User;

    @HasMany(() => TaskList)
    lists: TaskList[];

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;
}

export default TaskBoard;
