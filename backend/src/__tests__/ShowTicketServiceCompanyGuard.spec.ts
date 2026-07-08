// Regressão Bug B (QA): ShowTicketService precisa falhar de forma explícita
// quando o companyId é nulo. Sem isso, o Sequelize descarta o filtro
// `companyId: undefined` e a busca casa o ticket apenas por id — cruzando
// empresas e disparando o erro enganoso "não é possível consultar registros de
// outra empresa" no meio da execução de fluxos disparados por CRM.

const findOneMock = jest.fn();

jest.mock("../models/Ticket", () => ({
  __esModule: true,
  default: { findOne: (...args: any[]) => findOneMock(...args) }
}));

// Modelos apenas referenciados nos includes — mocks vazios bastam.
jest.mock("../models/Contact", () => ({ __esModule: true, default: {} }));
jest.mock("../models/User", () => ({ __esModule: true, default: {} }));
jest.mock("../models/Queue", () => ({ __esModule: true, default: {} }));
jest.mock("../models/Plan", () => ({ __esModule: true, default: {} }));
jest.mock("../models/Tag", () => ({ __esModule: true, default: {} }));
jest.mock("../models/Whatsapp", () => ({ __esModule: true, default: {} }));
jest.mock("../models/Company", () => ({ __esModule: true, default: {} }));
jest.mock("../models/QueueIntegrations", () => ({ __esModule: true, default: {} }));
jest.mock("../models/TicketTag", () => ({ __esModule: true, default: {} }));
jest.mock("../models/CrmLead", () => ({ __esModule: true, default: {} }));
jest.mock("../models/CrmClient", () => ({ __esModule: true, default: {} }));

jest.mock("../utils/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

import ShowTicketService from "../services/TicketServices/ShowTicketService";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ShowTicketService — guarda de companyId (Bug B)", () => {
  it("lança ERR_INVALID_COMPANY_CONTEXT quando companyId é undefined", async () => {
    await expect(
      ShowTicketService(641, undefined as any)
    ).rejects.toMatchObject({ message: "ERR_INVALID_COMPANY_CONTEXT", statusCode: 400 });
    // Não pode nem chegar a consultar o banco sem contexto de empresa.
    expect(findOneMock).not.toHaveBeenCalled();
  });

  it("lança ERR_INVALID_COMPANY_CONTEXT quando companyId é null", async () => {
    await expect(
      ShowTicketService(641, null as any)
    ).rejects.toMatchObject({ message: "ERR_INVALID_COMPANY_CONTEXT", statusCode: 400 });
    expect(findOneMock).not.toHaveBeenCalled();
  });

  it("lança ERR_INVALID_TICKET_IDENTIFIER para id não numérico antes de checar empresa", async () => {
    await expect(
      ShowTicketService("undefined", 154)
    ).rejects.toMatchObject({ message: "ERR_INVALID_TICKET_IDENTIFIER", statusCode: 400 });
    expect(findOneMock).not.toHaveBeenCalled();
  });

  it("com companyId válido, consulta o banco normalmente (id + companyId no where)", async () => {
    findOneMock.mockResolvedValue(null); // vai lançar 404 depois, mas já consultou
    await expect(ShowTicketService(641, 154)).rejects.toMatchObject({
      message: "ERR_NO_TICKET_FOUND",
      statusCode: 404
    });
    expect(findOneMock).toHaveBeenCalledTimes(1);
    const where = findOneMock.mock.calls[0][0].where;
    expect(where).toEqual(expect.objectContaining({ id: 641, companyId: 154 }));
  });
});
