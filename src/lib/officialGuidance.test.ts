import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  encodeOfficialGuidanceTag,
  extractClaimTokens,
  isTrustedOfficialUrl,
  pickOfficialGuidance,
  publisherForHost,
  shouldAttachOfficialGuidance,
  splitOfficialGuidance,
  type GuidanceSearchHit,
} from "./officialGuidance";

describe("shouldAttachOfficialGuidance", () => {
  it("skips greetings and memory questions", () => {
    assert.equal(shouldAttachOfficialGuidance("hello"), false);
    assert.equal(shouldAttachOfficialGuidance("thanks"), false);
    assert.equal(shouldAttachOfficialGuidance("remember that I am a GP in Leeds"), false);
    assert.equal(shouldAttachOfficialGuidance("what's my grade"), false);
  });

  it("keeps ordinary clinical questions", () => {
    assert.equal(shouldAttachOfficialGuidance("otitis media first line antibiotic"), true);
    assert.equal(shouldAttachOfficialGuidance("NICE criteria for 2WW colorectal referral"), true);
  });
});

describe("isTrustedOfficialUrl", () => {
  it("accepts live NICE, BNF, CKS, SIGN and NHS pages", () => {
    assert.ok(isTrustedOfficialUrl("https://cks.nice.org.uk/topics/otitis-media-acute/"));
    assert.ok(isTrustedOfficialUrl("https://bnf.nice.org.uk/drugs/amoxicillin/"));
    assert.ok(isTrustedOfficialUrl("https://www.nice.org.uk/guidance/ng91"));
    assert.ok(isTrustedOfficialUrl("https://www.sign.ac.uk/our-guidelines/asthma/"));
    assert.ok(isTrustedOfficialUrl("https://www.nhs.uk/conditions/ear-infections/"));
  });

  it("rejects untrusted or non-page URLs", () => {
    assert.equal(isTrustedOfficialUrl("https://cks.nice.org.uk/"), null);
    assert.equal(isTrustedOfficialUrl("https://www.nice.org.uk/news/article"), null);
    assert.equal(isTrustedOfficialUrl("https://www.cdc.gov/ear-infection"), null);
    assert.equal(isTrustedOfficialUrl("http://cks.nice.org.uk/topics/otitis-media-acute/"), null);
  });
});

describe("publisherForHost", () => {
  it("maps official hosts", () => {
    assert.equal(publisherForHost("cks.nice.org.uk"), "NICE CKS");
    assert.equal(publisherForHost("bnf.nice.org.uk"), "BNF");
    assert.equal(publisherForHost("www.nice.org.uk"), "NICE");
    assert.equal(publisherForHost("example.com"), null);
  });
});

describe("extractClaimTokens", () => {
  it("pulls guideline codes, doses and useful words", () => {
    const claims = extractClaimTokens("Give amoxicillin 5 days for acute otitis media (NICE NG91).");
    assert.ok(claims.codes.includes("ng91"));
    assert.ok(claims.quantities.includes("5 days"));
    assert.ok(claims.words.includes("amoxicillin"));
    assert.ok(claims.words.includes("otitis"));
  });
});

describe("pickOfficialGuidance", () => {
  const hits: GuidanceSearchHit[] = [
    {
      title: "Otitis media - acute | Health topics A to Z | CKS | NICE",
      url: "https://cks.nice.org.uk/topics/otitis-media-acute/",
      content: "First-line is analgesia. Consider amoxicillin for 5 days if delayed prescribing fails.",
    },
    {
      title: "Amoxicillin | BNF | NICE",
      url: "https://bnf.nice.org.uk/drugs/amoxicillin/",
      content: "Amoxicillin 5 days is commonly used for acute otitis media in children.",
    },
    {
      title: "Ear infections | NHS",
      url: "https://www.nhs.uk/conditions/ear-infections/",
      content: "Most ear infections get better without antibiotics.",
    },
    {
      title: "Random blog",
      url: "https://patient.info/ear-infection",
      content: "Amoxicillin 5 days for otitis media",
    },
    {
      title: "NICE homepage news",
      url: "https://www.nice.org.uk/news/otitis",
      content: "Otitis media amoxicillin 5 days NG91",
    },
  ];

  it("keeps matching official pages and drops untrusted ones", () => {
    const links = pickOfficialGuidance(
      hits,
      "otitis media first line antibiotic",
      "Analgesia first. If treating, amoxicillin for 5 days (NICE NG91)."
    );
    assert.ok(links.length >= 1 && links.length <= 3);
    assert.ok(links.every((link) => isTrustedOfficialUrl(link.url)));
    assert.ok(links.some((link) => link.publisher === "NICE CKS"));
    assert.equal(links.some((link) => link.url.includes("patient.info")), false);
    assert.equal(links.some((link) => link.url.includes("/news/")), false);
  });

  it("returns nothing when snippets do not support the answer", () => {
    const links = pickOfficialGuidance(
      [
        {
          title: "Hypertension | CKS | NICE",
          url: "https://cks.nice.org.uk/topics/hypertension/",
          content: "Offer lifestyle advice and discuss blood pressure targets.",
        },
      ],
      "otitis media first line antibiotic",
      "Give amoxicillin for 5 days."
    );
    assert.deepEqual(links, []);
  });

  it("prefers different publishers when several pages match", () => {
    const links = pickOfficialGuidance(
      hits,
      "otitis media first line antibiotic",
      "Analgesia first. If treating, amoxicillin for 5 days (NICE NG91)."
    );
    const publishers = new Set(links.map((link) => link.publisher));
    assert.ok(publishers.size >= Math.min(2, links.length));
  });
});

describe("guidance stream tags", () => {
  const links = [
    {
      title: "Otitis media - acute",
      url: "https://cks.nice.org.uk/topics/otitis-media-acute/",
      publisher: "NICE CKS",
    },
  ];

  it("round-trips a complete tag", () => {
    const packed = `First-line is analgesia.${encodeOfficialGuidanceTag(links)}`;
    const split = splitOfficialGuidance(packed);
    assert.equal(split.content, "First-line is analgesia.");
    assert.deepEqual(split.guidance, links);
    assert.equal(split.incomplete, false);
  });

  it("hides an incomplete tag while it is still streaming", () => {
    const packed = `First-line is analgesia.\n\n[[GUIDANCE]]{"links":`;
    const split = splitOfficialGuidance(packed);
    assert.equal(split.content, "First-line is analgesia.");
    assert.equal(split.guidance, undefined);
    assert.equal(split.incomplete, true);
  });

  it("drops forged links that are not on the allowlist", () => {
    const packed =
      'Answer[[GUIDANCE]]{"links":[{"title":"Bad","url":"https://evil.example/nice","publisher":"NICE"}]}[[/GUIDANCE]]';
    const split = splitOfficialGuidance(packed);
    assert.equal(split.content, "Answer");
    assert.equal(split.guidance, undefined);
  });
});
