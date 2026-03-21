import {
    Table,
    Column,
    CreatedAt,
    UpdatedAt,
    Model,
    PrimaryKey,
    AutoIncrement,
    DataType,
    BelongsTo,
    ForeignKey,
    BeforeSave,
    Default
} from "sequelize-typescript";
import Company from "./Company";
import { encrypt, decrypt } from "../helpers/crypto";

@Table({ tableName: "SmtpSettings" })
class SmtpSetting extends Model<SmtpSetting> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @Column(DataType.STRING)
    host: string;

    @Column(DataType.INTEGER)
    port: number;

    @Column(DataType.STRING)
    user: string;

    @Column(DataType.TEXT)
    get password(): string {
        const rawValue = this.getDataValue('password');
        // We return empty for safety on frontend payload, unless we specifically need it in backend. 
        // Usually backend just uses rawValue internally if we use decrypt.
        return rawValue ? decrypt(rawValue) : rawValue;
    }

    @Default(false)
    @Column(DataType.BOOLEAN)
    secure: boolean;

    @Column(DataType.STRING)
    senderName: string;

    @Column(DataType.STRING)
    senderEmail: string;

    @ForeignKey(() => Company)
    @Column
    companyId: number;

    @BelongsTo(() => Company)
    company: Company;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;

    @BeforeSave
    static encryptPassword(instance: SmtpSetting) {
        if (instance.changed("password")) {
            const plainPassword = instance.getDataValue('password'); // Gets the raw set value
            instance.setDataValue('password', encrypt(plainPassword));
        }
    }
}

export default SmtpSetting;
