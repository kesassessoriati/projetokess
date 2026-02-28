const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const Sequelize = require('sequelize');

async function fix() {
    const sequelize = new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASS,
        {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            dialect: process.env.DB_DIALECT,
        }
    );

    try {
        const res = await sequelize.query('ALTER TABLE "Opportunities" ALTER COLUMN "contactId" DROP NOT NULL;');
        console.log('Constraint removida com sucesso:', res);
    } catch (err) {
        console.error('Erro:', err);
    } finally {
        process.exit(0);
    }
}

fix();
