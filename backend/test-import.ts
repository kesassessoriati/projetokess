import "dotenv/config";
import sequelize from "./src/database";
import ImportCrmLeadsService from "./src/services/CrmLeadService/ImportCrmLeadsService";
import fs from "fs";

async function test() {
    await sequelize.authenticate();

    fs.writeFileSync("test.csv", "nome,telefone\nTest Lead A,5577999999999\nTest Lead B,5577888888888\n");

    const res = await ImportCrmLeadsService({
        companyId: 154,
        filePath: "test.csv",
        pipelineId: 6,
        stageId: 25,
        source: "Teste"
    });

    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
}

test();
