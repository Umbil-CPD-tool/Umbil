export const SITE_URL = "https://umbil.co.uk";

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const PERSON_ID = `${SITE_URL}/#angel-lian`;
export const SOFTWARE_ID = `${SITE_URL}/#software`;

const ANGEL_LINKEDIN = "https://www.linkedin.com/in/angel-lian/";
const ORGANIZATION_PROFILES = [
  "https://uk.linkedin.com/company/umbil",
  "https://www.instagram.com/umbil_ai/",
  "https://www.facebook.com/profile.php?id=61565964025530",
  "https://www.tiktok.com/@umbil_ai",
];

export const siteStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      name: "Umbil",
      legalName: "Mastering Medicine Ltd",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/umbil_logo.png.png`,
      },
      email: "support@umbil.co.uk",
      identifier: {
        "@type": "PropertyValue",
        name: "UK Company Number",
        value: "SC677347",
      },
      description:
        "Umbil is a clinical workflow assistant owned and operated by Mastering Medicine Ltd.",
      sameAs: ORGANIZATION_PROFILES,
      contactPoint: {
        "@type": "ContactPoint",
        email: "support@umbil.co.uk",
        contactType: "customer support",
        availableLanguage: "English",
      },
      employee: { "@id": PERSON_ID },
    },
    {
      "@type": "Person",
      "@id": PERSON_ID,
      name: "Angel (Yingzhou) Lian",
      alternateName: ["Angel Lian", "Yingzhou Lian"],
      givenName: "Yingzhou",
      additionalName: "Angel",
      familyName: "Lian",
      jobTitle: "Chief Technology Officer",
      description:
        "Chief Technology Officer and full-stack engineer who builds Umbil, the clinical workflow assistant operated by Mastering Medicine Ltd. Also known as Yingzhou Lian.",
      url: ANGEL_LINKEDIN,
      sameAs: [ANGEL_LINKEDIN],
      worksFor: { "@id": ORGANIZATION_ID },
    },
    {
      "@type": "SoftwareApplication",
      "@id": SOFTWARE_ID,
      name: "Umbil",
      applicationCategory: "HealthApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      description:
        "Clinical workflow assistant for drafting referrals, clinical summaries, safety-netting advice, and learning records.",
      creator: { "@id": PERSON_ID },
      provider: { "@id": ORGANIZATION_ID },
      publisher: { "@id": ORGANIZATION_ID },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Umbil",
      description: "Clinical workflow assistant and referral writer.",
      publisher: { "@id": ORGANIZATION_ID },
      inLanguage: "en-GB",
    },
  ],
};

export const serializeJsonLd = (data: unknown): string =>
  JSON.stringify(data).replace(/</g, "\\u003c");
