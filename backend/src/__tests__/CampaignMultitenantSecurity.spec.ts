jest.mock("../libs/socket", () => ({
  getIO: jest.fn(() => ({
    of: jest.fn(() => ({
      emit: jest.fn()
    }))
  }))
}));

jest.mock("../queues", () => ({
  campaignQueue: {
    add: jest.fn(),
    getJob: jest.fn()
  }
}));

jest.mock("../utils/logger", () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock("../models/CampaignShipping", () => ({
  __esModule: true,
  default: {}
}));

jest.mock("../models/Ticket", () => ({
  __esModule: true,
  default: {}
}));

jest.mock("../models/Campaign", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn()
  }
}));

jest.mock("../models/ContactList", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn()
  }
}));

jest.mock("../models/Whatsapp", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn()
  }
}));

jest.mock("../models/User", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn()
  }
}));

jest.mock("../models/Queue", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn()
  }
}));

jest.mock("../models/Tag", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn()
  }
}));

jest.mock("../models/ContactTag", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn()
  }
}));

jest.mock("../models/Contact", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn()
  }
}));

jest.mock("../models/ContactListItem", () => ({
  __esModule: true,
  default: {
    bulkCreate: jest.fn()
  }
}));

jest.mock("../services/CampaignService/FindService", () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock("../services/CampaignService/GetAnalyticsOverviewService", () => ({
  __esModule: true,
  default: jest.fn()
}));

import Campaign from "../models/Campaign";
import Contact from "../models/Contact";
import ContactList from "../models/ContactList";
import ContactListItem from "../models/ContactListItem";
import ContactTag from "../models/ContactTag";
import Queue from "../models/Queue";
import Tag from "../models/Tag";
import Whatsapp from "../models/Whatsapp";
import * as CampaignController from "../controllers/CampaignController";
import CreateService from "../services/CampaignService/CreateService";
import DeleteService from "../services/CampaignService/DeleteService";
import FindService from "../services/CampaignService/FindService";
import { RestartService } from "../services/CampaignService/RestartService";
import ShowService from "../services/CampaignService/ShowService";
import UpdateService from "../services/CampaignService/UpdateService";
import { CancelService } from "../services/CampaignService/CancelService";

const campaignMock = Campaign as any;
const contactListMock = ContactList as any;
const whatsappMock = Whatsapp as any;
const queueMock = Queue as any;
const tagMock = Tag as any;
const contactTagMock = ContactTag as any;
const contactMock = Contact as any;
const contactListItemMock = ContactListItem as any;
const findServiceMock = FindService as jest.Mock;

describe("Campaign multitenant security", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not show a campaign from another company", async () => {
    campaignMock.findOne.mockResolvedValue(null);

    await expect(ShowService({ id: 10, companyId: 1 })).rejects.toMatchObject({
      message: "ERR_NO_CAMPAIGN_FOUND",
      statusCode: 404
    });

    expect(campaignMock.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 10, companyId: 1 } })
    );
  });

  it("does not update a campaign from another company", async () => {
    campaignMock.findOne.mockResolvedValue(null);

    await expect(
      UpdateService({
        id: 10,
        companyId: 1,
        name: "Campanha",
        status: "INATIVA",
        confirmation: false,
        scheduledAt: "",
        contactListId: 1,
        userId: "",
        queueId: "",
        statusTicket: "open",
        openTicket: "enabled"
      })
    ).rejects.toMatchObject({ message: "ERR_NO_CAMPAIGN_FOUND" });
  });

  it("does not delete a campaign from another company", async () => {
    campaignMock.findOne.mockResolvedValue(null);

    await expect(DeleteService("10", 1)).rejects.toMatchObject({
      message: "ERR_NO_CAMPAIGN_FOUND"
    });

    expect(campaignMock.findOne).toHaveBeenCalledWith({ where: { id: "10", companyId: 1 } });
  });

  it("does not cancel or restart a campaign from another company", async () => {
    campaignMock.findOne.mockResolvedValue(null);

    await expect(CancelService(10, 1)).rejects.toMatchObject({
      message: "ERR_NO_CAMPAIGN_FOUND"
    });
    await expect(RestartService(10, 1)).rejects.toMatchObject({
      message: "ERR_NO_CAMPAIGN_FOUND"
    });
  });

  it("rejects contact lists, whatsapp, tags and queue from another company on create", async () => {
    contactListMock.findOne.mockResolvedValue(null);

    await expect(
      CreateService({
        name: "Campanha",
        status: "INATIVA",
        confirmation: false,
        scheduledAt: "",
        companyId: 1,
        contactListId: 99,
        userId: "",
        queueId: "",
        statusTicket: "open",
        openTicket: "enabled"
      })
    ).rejects.toMatchObject({ message: "ERR_INVALID_CAMPAIGN_RELATIONSHIP" });

    contactListMock.findOne.mockResolvedValue({ id: 1 });
    whatsappMock.findOne.mockResolvedValue(null);

    await expect(
      CreateService({
        name: "Campanha",
        status: "INATIVA",
        confirmation: false,
        scheduledAt: "",
        companyId: 1,
        contactListId: 1,
        whatsappId: 50,
        userId: "",
        queueId: "",
        statusTicket: "open",
        openTicket: "enabled"
      } as any)
    ).rejects.toMatchObject({ message: "ERR_INVALID_CAMPAIGN_RELATIONSHIP" });

    whatsappMock.findOne.mockResolvedValue({ id: 50 });
    queueMock.findOne.mockResolvedValue(null);

    await expect(
      CreateService({
        name: "Campanha",
        status: "INATIVA",
        confirmation: false,
        scheduledAt: "",
        companyId: 1,
        contactListId: 1,
        whatsappId: 50,
        userId: "",
        queueId: 80,
        statusTicket: "open",
        openTicket: "enabled"
      } as any)
    ).rejects.toMatchObject({ message: "ERR_INVALID_CAMPAIGN_RELATIONSHIP" });

    queueMock.findOne.mockResolvedValue({ id: 80 });
    tagMock.findOne.mockResolvedValue(null);

    await expect(
      CreateService({
        name: "Campanha",
        status: "INATIVA",
        confirmation: false,
        scheduledAt: "",
        companyId: 1,
        contactListId: 1,
        whatsappId: 50,
        userId: "",
        queueId: 80,
        tagListId: 20,
        statusTicket: "open",
        openTicket: "enabled"
      } as any)
    ).rejects.toMatchObject({ message: "ERR_INVALID_CAMPAIGN_RELATIONSHIP" });
  });

  it("/campaigns/list ignores query companyId and uses authenticated companyId", async () => {
    findServiceMock.mockResolvedValue([{ id: 1 }]);
    const req = {
      query: { companyId: 999 },
      user: { companyId: 7 }
    } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as any;

    await CampaignController.findList(req, res);

    expect(findServiceMock).toHaveBeenCalledWith({ companyId: 7 });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("creates a contact list from tag using only contacts from authenticated company", async () => {
    tagMock.findOne.mockResolvedValue({ id: 20, companyId: 7 });
    contactTagMock.findAll.mockResolvedValue([{ contactId: 30 }, { contactId: 31 }]);
    contactMock.findAll.mockResolvedValue([
      { name: "A", number: "5511999999999", email: "a@example.com", isGroup: false }
    ]);
    contactListMock.create.mockResolvedValue({ id: 70 });
    contactListMock.findOne.mockResolvedValue({ id: 70, companyId: 7 });
    campaignMock.create.mockResolvedValue({
      id: 90,
      reload: jest.fn().mockResolvedValue(undefined)
    });

    const req = {
      body: {
        name: "Campanha tag",
        status: "INATIVA",
        confirmation: false,
        scheduledAt: "",
        tagListId: 20,
        userId: "",
        queueId: "",
        statusTicket: "open",
        openTicket: "enabled"
      },
      user: { companyId: 7 }
    } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as any;

    await CampaignController.store(req, res);

    expect(tagMock.findOne).toHaveBeenCalledWith({ where: { id: 20, companyId: 7 } });
    expect(contactMock.findAll.mock.calls[0][0].where.companyId).toBe(7);
    expect(contactMock.findAll.mock.calls[0][0].where.id).toBeDefined();
    expect(contactListItemMock.bulkCreate).toHaveBeenCalledWith([
      expect.objectContaining({ contactListId: 70, companyId: 7 })
    ]);
    expect(campaignMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 7, contactListId: 70 })
    );
  });
});
