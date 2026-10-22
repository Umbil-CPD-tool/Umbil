import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { serializeJsonLd, siteStructuredData } from "./siteSchema";

describe("site structured data", () => {
  it("connects Angel (Yingzhou) Lian, Yingzhou Lian, and Umbil", () => {
    const graph = siteStructuredData["@graph"];
    const person = graph.find((node) => node["@type"] === "Person");
    const organization = graph.find((node) => node["@type"] === "Organization");
    const software = graph.find((node) => node["@type"] === "SoftwareApplication");

    assert.ok(person);
    assert.ok(organization);
    assert.ok(software);
    assert.equal(person.name, "Angel (Yingzhou) Lian");
    assert.deepEqual(person.alternateName, ["Angel Lian", "Yingzhou Lian"]);
    assert.equal(person.jobTitle, "Chief Technology Officer");
    assert.deepEqual(person.sameAs, ["https://www.linkedin.com/in/angel-lian/"]);
    assert.equal(person.worksFor["@id"], organization["@id"]);
    assert.equal(organization.employee["@id"], person["@id"]);
    assert.equal(organization.legalName, "Mastering Medicine Ltd");
    assert.equal(software.creator["@id"], person["@id"]);
    assert.equal(serializeJsonLd({ note: "<script>" }).includes("<"), false);
  });
});
