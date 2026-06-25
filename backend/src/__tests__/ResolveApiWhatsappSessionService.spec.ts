const mockGetWbot = jest.fn();

jest.mock("../libs/wbot", () => ({
  getWbot: mockGetWbot
}));

jest.mock("../utils/logger", () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn()
}));

import AppError from "../errors/AppError";
import resolveApiWhatsappSession, {
  ApiWhatsappSessionError
} from "../services/WbotServices/ResolveApiWhatsappSessionService";

const buildWhatsapp = (overrides: Record<string, any> = {}) =>
  ({
    id: 92,
    companyId: 169,
    status: "CONNECTED",
    ...overrides
  } as any);

describe("ResolveApiWhatsappSessionService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the loaded WhatsApp session for a CONNECTED connection", () => {
    const session = { id: 92 };
    mockGetWbot.mockReturnValue(session);

    const result = resolveApiWhatsappSession(buildWhatsapp());

    expect(result).toBe(session);
    expect(mockGetWbot).toHaveBeenCalledWith(92);
  });

  it("throws a diagnostic error when DB is CONNECTED but session is not loaded", () => {
    mockGetWbot.mockImplementation(() => {
      throw new AppError("ERR_WAPP_NOT_INITIALIZED");
    });

    let capturedError: any;
    try {
      resolveApiWhatsappSession(buildWhatsapp());
    } catch (err: any) {
      capturedError = err;
    }

    expect(capturedError).toBeInstanceOf(ApiWhatsappSessionError);
    expect(capturedError.message).toBe("ERR_WAPP_NOT_INITIALIZED");
    expect(capturedError.statusCode).toBe(409);
    expect(capturedError.details).toEqual({
      companyId: 169,
      whatsappId: 92,
      whatsappStatus: "CONNECTED",
      sessionLoaded: false
    });
    expect(capturedError.publicMessage).toContain("WhatsApp");
  });

  it("does not call getWbot when the WhatsApp connection is not CONNECTED", () => {
    let capturedError: any;

    try {
      resolveApiWhatsappSession(buildWhatsapp({ status: "DISCONNECTED" }));
    } catch (err: any) {
      capturedError = err;
    }

    expect(mockGetWbot).not.toHaveBeenCalled();
    expect(capturedError).toBeInstanceOf(ApiWhatsappSessionError);
    expect(capturedError.message).toBe("ERR_WAPP_NOT_CONNECTED");
    expect(capturedError.statusCode).toBe(409);
    expect(capturedError.details).toEqual({
      companyId: 169,
      whatsappId: 92,
      whatsappStatus: "DISCONNECTED",
      sessionLoaded: false
    });
  });
});
