import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveWord } from "./dictionary";

const data = JSON.parse(
  readFileSync(`${__dirname}/../../public/data/dictionary-id.json`, "utf8")
);

describe("resolveWord (Indonesian)", () => {
  it("finds exact entries case-insensitively", () => {
    const e = resolveWord(data, "Gergaji");
    expect(e?.word).toBe("gergaji");
    expect(e?.senses[0].gloss).toMatch(/saw/);
    expect(e?.lemmaInfo).toBeUndefined();
  });

  it("follows the inflection table", () => {
    const e = resolveWord(data, "meneken");
    expect(e?.word).toBe("teken");
    expect(e?.lemmaInfo?.label).toBe("active form of");
  });

  it("peels clitics such as -nya", () => {
    const e = resolveWord(data, "rumahnya");
    expect(e?.word).toBe("rumah");
    expect(e?.lemmaInfo?.label).toBe("nya form of");
  });

  it("returns undefined for nonsense", () => {
    expect(resolveWord(data, "qzxqzx")).toBeUndefined();
  });
});
