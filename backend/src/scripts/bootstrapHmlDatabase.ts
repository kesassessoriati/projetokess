import sequelize from "../database";

/**
 * Creates the disposable HML schema from the current models.
 *
 * The legacy migration history does not contain the original schema migrations
 * and some of its model relationships are cyclic. HML deliberately omits
 * foreign-key constraints during this one-time bootstrap; production continues
 * to use its established migration-managed database.
 */
const removeForeignKeyReferences = (): void => {
  const models = (sequelize as any).modelManager.models || [];

  for (const model of models) {
    for (const attributes of [
      model.rawAttributes,
      model.tableAttributes,
      model.fieldRawAttributesMap
    ]) {
      for (const attribute of Object.values(attributes || {}) as any[]) {
        delete attribute.references;
        delete attribute.onDelete;
        delete attribute.onUpdate;
      }
    }
  }
};

const main = async (): Promise<void> => {
  removeForeignKeyReferences();
  await sequelize.sync({ logging: false });
  await sequelize.close();
};

main().catch(async error => {
  console.error(error);
  await sequelize.close();
  process.exit(1);
});
