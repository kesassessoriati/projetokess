import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const whatsappTable = await queryInterface.describeTable("Whatsapps") as any;
    const messageTable = await queryInterface.describeTable("Messages") as any;

    const addWhatsappColumn = async (name: string, spec: any) => {
      if (!whatsappTable[name]) {
        await queryInterface.addColumn("Whatsapps", name, spec);
      }
    };

    const addMessageColumn = async (name: string, spec: any) => {
      if (!messageTable[name]) {
        await queryInterface.addColumn("Messages", name, spec);
      }
    };

    await addWhatsappColumn("emailAddress", { type: DataTypes.STRING, allowNull: true });
    await addWhatsappColumn("emailDisplayName", { type: DataTypes.STRING, allowNull: true });
    await addWhatsappColumn("emailSignature", { type: DataTypes.TEXT, allowNull: true });
    await addWhatsappColumn("emailUseCompanySmtp", { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true });
    await addWhatsappColumn("emailSmtpHost", { type: DataTypes.STRING, allowNull: true });
    await addWhatsappColumn("emailSmtpPort", { type: DataTypes.INTEGER, allowNull: true });
    await addWhatsappColumn("emailSmtpSecure", { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
    await addWhatsappColumn("emailSmtpUser", { type: DataTypes.STRING, allowNull: true });
    await addWhatsappColumn("emailSmtpPassword", { type: DataTypes.STRING, allowNull: true });
    await addWhatsappColumn("emailImapHost", { type: DataTypes.STRING, allowNull: true });
    await addWhatsappColumn("emailImapPort", { type: DataTypes.INTEGER, allowNull: true });
    await addWhatsappColumn("emailImapSecure", { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true });
    await addWhatsappColumn("emailImapUser", { type: DataTypes.STRING, allowNull: true });
    await addWhatsappColumn("emailImapPassword", { type: DataTypes.STRING, allowNull: true });
    await addWhatsappColumn("emailSyncEnabled", { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true });
    await addWhatsappColumn("emailLastSyncAt", { type: DataTypes.DATE, allowNull: true });
    await addWhatsappColumn("emailLastUid", { type: DataTypes.BIGINT, allowNull: true });
    await addWhatsappColumn("emailSyncError", { type: DataTypes.TEXT, allowNull: true });

    await addMessageColumn("externalMessageId", { type: DataTypes.STRING, allowNull: true });
    await addMessageColumn("inReplyTo", { type: DataTypes.STRING, allowNull: true });
    await addMessageColumn("threadId", { type: DataTypes.STRING, allowNull: true });
    await addMessageColumn("emailFrom", { type: DataTypes.STRING, allowNull: true });
    await addMessageColumn("emailTo", { type: DataTypes.TEXT, allowNull: true });
    await addMessageColumn("emailCc", { type: DataTypes.TEXT, allowNull: true });
    await addMessageColumn("emailBcc", { type: DataTypes.TEXT, allowNull: true });
    await addMessageColumn("emailSubject", { type: DataTypes.STRING, allowNull: true });
    await addMessageColumn("emailStatus", { type: DataTypes.STRING, allowNull: true });
    await addMessageColumn("emailMeta", { type: DataTypes.JSONB, allowNull: true });
  },

  down: async (queryInterface: QueryInterface) => {
    const removeColumn = async (table: string, column: string) => {
      await queryInterface.removeColumn(table, column).catch(() => undefined);
    };

    const whatsappColumns = [
      "emailAddress",
      "emailDisplayName",
      "emailSignature",
      "emailUseCompanySmtp",
      "emailSmtpHost",
      "emailSmtpPort",
      "emailSmtpSecure",
      "emailSmtpUser",
      "emailSmtpPassword",
      "emailImapHost",
      "emailImapPort",
      "emailImapSecure",
      "emailImapUser",
      "emailImapPassword",
      "emailSyncEnabled",
      "emailLastSyncAt",
      "emailLastUid",
      "emailSyncError"
    ];

    const messageColumns = [
      "externalMessageId",
      "inReplyTo",
      "threadId",
      "emailFrom",
      "emailTo",
      "emailCc",
      "emailBcc",
      "emailSubject",
      "emailStatus",
      "emailMeta"
    ];

    for (const col of whatsappColumns) {
      await removeColumn("Whatsapps", col);
    }

    for (const col of messageColumns) {
      await removeColumn("Messages", col);
    }
  }
};

