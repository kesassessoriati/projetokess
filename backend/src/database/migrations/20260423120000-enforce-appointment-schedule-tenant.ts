import { QueryInterface } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    if (queryInterface.sequelize.getDialect() !== "postgres") {
      return;
    }

    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION enforce_appointment_schedule_tenant()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.schedule_id IS NULL OR NEW.company_id IS NULL THEN
          RETURN NEW;
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM user_schedules
          WHERE id = NEW.schedule_id
            AND company_id = NEW.company_id
        ) THEN
          RAISE EXCEPTION 'appointment schedule tenant mismatch'
            USING ERRCODE = '23514';
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS appointments_schedule_tenant_guard ON appointments;
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER appointments_schedule_tenant_guard
      BEFORE INSERT OR UPDATE OF schedule_id, company_id ON appointments
      FOR EACH ROW
      EXECUTE FUNCTION enforce_appointment_schedule_tenant();
    `);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    if (queryInterface.sequelize.getDialect() !== "postgres") {
      return;
    }

    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS appointments_schedule_tenant_guard ON appointments;
    `);

    await queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS enforce_appointment_schedule_tenant();
    `);
  }
};
