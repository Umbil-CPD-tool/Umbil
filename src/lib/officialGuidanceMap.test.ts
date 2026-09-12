import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertCuratedGuidanceMapIntegrity,
  CURATED_GUIDANCE_ENTRIES,
  lookupCuratedOfficialGuidance,
  mergeGuidanceEntries,
} from "./officialGuidanceMap";
import { isTrustedOfficialUrl, MAX_OFFICIAL_GUIDANCE } from "./officialGuidance";

describe("curated official guidance map", () => {
  it("has thorough coverage with only trusted URLs", () => {
    const integrity = assertCuratedGuidanceMapIntegrity();
    assert.ok(integrity.entryCount >= 80, `expected many entries, got ${integrity.entryCount}`);
    assert.ok(integrity.linkCount >= 150, `expected many links, got ${integrity.linkCount}`);
    assert.deepEqual(integrity.invalidUrls, []);
  });

  it("returns CKS/NICE for common GP questions", () => {
    const otitis = lookupCuratedOfficialGuidance(
      "otitis media first line antibiotic",
      "Analgesia first. If treating, amoxicillin for 5 days."
    );
    assert.ok(otitis.length >= 1 && otitis.length <= MAX_OFFICIAL_GUIDANCE);
    assert.ok(otitis.some((link) => link.url.includes("otitis-media-acute")));
    assert.ok(otitis.some((link) => link.publisher === "BNF" || link.url.includes("amoxicillin")));

    const uti = lookupCuratedOfficialGuidance("uncomplicated UTI in women first line");
    assert.ok(uti.some((link) => link.url.includes("urinary-tract-infection-lower-women")));

    const asthma = lookupCuratedOfficialGuidance("asthma management in adults");
    assert.ok(asthma.some((link) => link.publisher === "NICE CKS" || link.publisher === "SIGN"));
  });

  it("does not attach wrong-topic links", () => {
    const links = lookupCuratedOfficialGuidance(
      "hypertension blood pressure targets",
      "Offer lifestyle advice and discuss blood pressure targets."
    );
    assert.ok(links.some((link) => link.url.includes("hypertension")));
    assert.equal(links.some((link) => link.url.includes("otitis")), false);
    assert.equal(links.some((link) => link.url.includes("sore-throat")), false);
  });

  it("returns nothing for greetings and vague non-clinical chat", () => {
    assert.deepEqual(lookupCuratedOfficialGuidance("hello"), []);
    assert.deepEqual(lookupCuratedOfficialGuidance("thanks"), []);
    assert.deepEqual(lookupCuratedOfficialGuidance("what can you do"), []);
  });

  it("resolves drug names to BNF pages", () => {
    const links = lookupCuratedOfficialGuidance("what is the BNF dose for apixaban in AF");
    assert.ok(links.some((link) => link.url.includes("apixaban")));
    assert.ok(links.every((link) => isTrustedOfficialUrl(link.url)));
  });

  it("covers triage-aligned presentations", () => {
    const cases: Array<{ q: string; mustInclude: string }> = [
      { q: "chest pain radiating to arm", mustInclude: "chest-pain" },
      { q: "suspected DVT calf swelling", mustInclude: "deep-vein-thrombosis" },
      { q: "postmenopausal bleeding referral", mustInclude: "gynaecological-cancers" },
      { q: "sore throat centor criteria", mustInclude: "sore-throat" },
      { q: "child fever in a 2 year old", mustInclude: "ng143" },
      { q: "head injury after fall", mustInclude: "ng232" },
      { q: "stroke facial droop FAST", mustInclude: "ng128" },
      { q: "breast lump referral pathway", mustInclude: "breast-cancer" },
    ];

    for (const item of cases) {
      const links = lookupCuratedOfficialGuidance(item.q);
      assert.ok(
        links.some((link) => link.url.toLowerCase().includes(item.mustInclude)),
        `expected ${item.mustInclude} for "${item.q}", got ${links.map((l) => l.url).join(", ") || "(none)"}`
      );
    }
  });

  it("keeps aliases unique enough per entry", () => {
    for (const entry of CURATED_GUIDANCE_ENTRIES) {
      const normalized = entry.aliases.map((alias) => alias.trim().toLowerCase());
      assert.equal(new Set(normalized).size, normalized.length, entry.id);
    }
  });

  it("covers expanded conditions, drugs and NICE codes", () => {
    const measles = lookupCuratedOfficialGuidance("measles notification in primary care");
    assert.ok(measles.some((link) => link.url.includes("measles") || link.url.includes("green-book")));

    const scabies = lookupCuratedOfficialGuidance("scabies treatment in household");
    assert.ok(scabies.some((link) => link.url.includes("scabies")));

    const valproate = lookupCuratedOfficialGuidance("sodium valproate pregnancy prevention");
    assert.ok(valproate.some((link) => link.url.includes("valproate")));
    assert.equal(valproate.some((link) => link.url.includes("miscarriage")), false);

    const ng91 = lookupCuratedOfficialGuidance("remind me what NG91 says");
    assert.ok(ng91.some((link) => link.url.includes("ng91")));
  });

  it("lets a Supabase overlay override an in-code topic", () => {
    const merged = mergeGuidanceEntries(CURATED_GUIDANCE_ENTRIES, [
      {
        id: "asthma",
        aliases: ["asthma"],
        priority: 20,
        links: [
          {
            title: "Asthma overlay",
            url: "https://cks.nice.org.uk/topics/asthma/",
            publisher: "NICE CKS",
          },
        ],
      },
    ]);
    const asthma = merged.find((entry) => entry.id === "asthma");
    assert.equal(asthma?.links[0].title, "Asthma overlay");

    const links = lookupCuratedOfficialGuidance("zebra rash syndrome", "", [
      {
        id: "brand-new-topic",
        aliases: ["zebra rash syndrome"],
        links: [
          {
            title: "Neck lump",
            url: "https://cks.nice.org.uk/topics/neck-lump/",
            publisher: "NICE CKS",
          },
        ],
      },
    ]);
    assert.ok(links.some((link) => link.url.includes("neck-lump")));
  });
});
