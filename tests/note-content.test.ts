import { describe, expect, it } from "vitest";

import {
  createDateVariableMap,
  resolveNoteTemplateText,
} from "../src/screen/note-content.js";

describe("note template resolution", () => {
  it("resolves all supported date variables", () => {
    const now = new Date("2026-03-28T21:07:09+09:00");

    expect(
      resolveNoteTemplateText(
        "{YY} {YYYY} {M} {MM} {D} {DD} {H} {HH} {h} {hh} {m} {mm} {s} {ss} {a} {ddd}",
        { now },
      ),
    ).toBe("26 2026 3 03 28 28 21 21 9 09 7 07 9 09 오후 토");
  });

  it("uses the normal 12-hour clock boundaries", () => {
    expect(createDateVariableMap(new Date("2026-03-28T00:05:07+09:00"))).toMatchObject({
      h: "12",
      hh: "12",
      a: "오전",
    });
    expect(createDateVariableMap(new Date("2026-03-28T12:05:07+09:00"))).toMatchObject({
      h: "12",
      hh: "12",
      a: "오후",
    });
    expect(createDateVariableMap(new Date("2026-03-28T23:05:07+09:00"))).toMatchObject({
      h: "11",
      hh: "11",
      a: "오후",
    });
  });

  it("resolves custom variables and leaves missing ones blank", () => {
    const now = new Date("2026-03-28T21:07:09+09:00");

    expect(
      resolveNoteTemplateText(
        "배터리 {&battery}% / 온도 {&temp} / 누락 [{&missing}]",
        {
          now,
          customVariables: {
            battery: "82",
            temp: "18C",
          },
        },
      ),
    ).toBe("배터리 82% / 온도 18C / 누락 []");
  });

  it("supports padleft and padright custom variables", () => {
    const now = new Date("2026-03-28T21:07:09+09:00");

    expect(
      resolveNoteTemplateText("<{3:&battery}>", {
        now,
        customVariables: {
          battery: "3",
        },
      }),
    ).toBe("<  3>");
    expect(
      resolveNoteTemplateText("<{&battery:3}>", {
        now,
        customVariables: {
          battery: "3",
        },
      }),
    ).toBe("<3  >");
  });

  it("resolves variables before note highlighting is interpreted", () => {
    const now = new Date("2026-03-28T21:07:09+09:00");

    expect(
      resolveNoteTemplateText("<{HH}:{mm}> <배터리 {&battery}%>", {
        now,
        customVariables: {
          battery: "82",
        },
      }),
    ).toBe("<21:07> <배터리 82%>");
  });
});
