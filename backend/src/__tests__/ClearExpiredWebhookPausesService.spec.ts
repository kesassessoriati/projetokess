import Ticket from "../models/Ticket";
import ClearExpiredWebhookPausesService from "../services/TicketServices/ClearExpiredWebhookPausesService";

describe("ClearExpiredWebhookPausesService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("clears expired pauses only for active tickets", async () => {
    const ticketUpdateSpy = jest
      .spyOn(Ticket, "update")
      .mockResolvedValue([2] as any);

    const affectedRows = await ClearExpiredWebhookPausesService();

    expect(affectedRows).toBe(2);
    expect(ticketUpdateSpy).toHaveBeenCalledWith(
      { webhookPausedUntil: null },
      expect.objectContaining({
        where: expect.objectContaining({
          status: expect.any(Object),
          webhookPausedUntil: expect.any(Object)
        })
      })
    );
  });
});
