import { asMinorUnits, formatMinorCurrency } from "./pilotUtils";

describe("campaign-pilot monetary helpers", () => {
  it("converts Brazilian decimal input to Meta minor units", () => {
    expect(asMinorUnits("10,50")).toBe("1050");
    expect(asMinorUnits("1.000,01")).toBe("100001");
    expect(asMinorUnits("0")).toBeNull();
  });

  it("formats Meta minor units without inflating the displayed amount", () => {
    expect(formatMinorCurrency("10000", "BRL")).toBe("BRL 100,00");
  });
});
