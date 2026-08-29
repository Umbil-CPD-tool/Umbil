import { Resend } from "resend";

const FROM = "Umbil <hello@notifications.umbil.co.uk>";
const REPLY_TO = "umbil.support@gmail.com";
const BRAND = "#1fb8cd";
const SITE = "https://umbil.co.uk";

const LINKS = {
  dashboard: `${SITE}/dashboard`,
  capture: `${SITE}/capture-learning`,
  settings: `${SITE}/settings`,
  contact: `${SITE}/settings/contact`,
};

const PLAN_PRICE: Record<string, string> = {
  pro_monthly: "£24/month",
  pro_annual: "£200/year",
  team_monthly: "£199/month",
  team_annual: "£1,899/year",
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const linkStyle = `color: ${BRAND}; font-weight: 700; text-decoration: none;`;

const tryItem = (href: string, title: string, body: string) => `
  <tr>
    <td style="padding: 0 0 18px;">
      <p style="margin: 0 0 4px; font-size: 16px; font-weight: 700; color: #111827;">
        <a href="${href}" style="${linkStyle}">${title}</a>
      </p>
      <p style="margin: 0; font-size: 15px; line-height: 1.55; color: #4b5563;">${body}</p>
    </td>
  </tr>
`;

const included = (text: string) => `
  <tr>
    <td style="padding: 0 0 8px; font-size: 15px; line-height: 1.5; color: #1f2937;">
      <span style="color: ${BRAND}; font-weight: 700;">✓</span> ${text}
    </td>
  </tr>
`;

export const sendProWelcomeEmail = async ({
  to,
  name,
  planType,
  checkoutSessionId,
}: {
  to: string;
  name?: string | null;
  planType?: string | null;
  checkoutSessionId: string;
}) => {
  if (!process.env.RESEND_API_KEY) {
    console.error("Pro welcome email skipped: RESEND_API_KEY is not set");
    return;
  }

  const firstName = name?.trim().split(/\s+/)[0];
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : "Hi,";
  const isTeam = typeof planType === "string" && planType.startsWith("team_");
  const planLabel = isTeam ? "Umbil Team" : "Umbil Pro";
  const priceLabel = (planType && PLAN_PRICE[planType]) || (isTeam ? "£199/month" : "£24/month");

  const billingBlock = isTeam
    ? `
      <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 0 0 8px;">
        <strong>Your team subscription is active</strong>
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 8px;">
        You are billed at ${escapeHtml(priceLabel)}. You can cancel anytime from
        <a href="${LINKS.settings}" style="${linkStyle}">Settings \u2192 Manage Subscription</a>.
      </p>
    `
    : `
      <p style="font-size: 16px; line-height: 1.6; color: #111827; margin: 0 0 8px;">
        <strong>Your first month is free</strong>
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 8px;">
        Explore everything in Pro for your first month at £0. After that, your subscription continues at ${escapeHtml(priceLabel)} unless you cancel.
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0;">
        Cancel anytime from <a href="${LINKS.settings}" style="${linkStyle}">Settings \u2192 Manage Subscription</a>.
      </p>
    `;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 16px; color: #1a1a1a;">
      <p style="font-size: 13px; font-weight: 700; letter-spacing: 0.06em; color: ${BRAND}; margin: 0 0 24px;">UMBIL</p>

      <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 0 0 8px;">${greeting}</p>
      <h1 style="font-size: 24px; font-weight: 800; margin: 0 0 16px; color: #111827;">Welcome to ${escapeHtml(planLabel)}</h1>

      <p style="font-size: 16px; line-height: 1.65; color: #374151; margin: 0 0 28px;">
        Thanks for supporting Umbil. Pro gives you the full experience \u2014 helping you answer clinical questions, reduce admin, and turn everyday clinical work into meaningful CPD.
      </p>

      <p style="font-size: 14px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: ${BRAND}; margin: 0 0 12px;">Start using Pro</p>
      <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 16px;">Three things worth trying today:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 28px;">
        ${tryItem(LINKS.dashboard, "Ask a clinical question", "Get UK-focused, guideline-aligned clinical support when you need it.")}
        ${tryItem(LINKS.capture, "Capture learning", "Turn something you learned today into a structured learning log with an AI reflection prompt.")}
        ${tryItem(LINKS.dashboard, "Use a clinical tool", "Create referrals, safety-netting advice, SBARs, patient information and more in seconds.")}
      </table>

      <p style="font-size: 14px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: ${BRAND}; margin: 0 0 12px;">What's included with Pro?</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 28px;">
        ${included("Unlimited clinical questions \u2014 no monthly caps")}
        ${included("Unlimited Capture Learning &amp; AI reflections")}
        ${included("Unlimited clinical tools")}
        ${included("Patient Feedback (PSQ) &amp; Colleague Feedback (MSF) reports")}
        ${included("Automated Personal Development Plans (PDPs)")}
        ${included("UK guideline-aligned clinical support")}
      </table>

      <div style="background: #f0fbfd; border: 1px solid #c5eef4; border-radius: 12px; padding: 16px 18px; margin: 0 0 28px;">
        ${billingBlock}
      </div>

      <p style="font-size: 14px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: ${BRAND}; margin: 0 0 8px;">Built for your everyday workflow</p>
      <p style="font-size: 16px; font-weight: 700; color: #111827; margin: 0 0 10px;">Clinical question \u2192 Action \u2192 Learning \u2192 Appraisal</p>
      <p style="font-size: 15px; line-height: 1.65; color: #4b5563; margin: 0 0 28px;">
        That is what Umbil is built around \u2014 less time on the admin around clinical work, more time with patients.
      </p>

      <p style="margin: 0 0 28px;">
        <a href="${LINKS.dashboard}" style="display: inline-block; background-color: ${BRAND}; color: #ffffff; font-weight: 700; font-size: 16px; text-decoration: none; padding: 14px 24px; border-radius: 8px;">
          Open Umbil \u2192
        </a>
      </p>

      <p style="font-size: 15px; line-height: 1.65; color: #374151; margin: 0 0 16px;">
        If you have a question, spot something that does not feel right, or have an idea to make Umbil better, hit reply \u2014 it comes to us \u2014 or use
        <a href="${LINKS.contact}" style="${linkStyle}">Contact Us</a> in the app.
      </p>

      <p style="font-size: 15px; line-height: 1.6; color: #374151; margin: 0;">Thanks again for being part of Umbil.</p>
      <p style="font-size: 15px; line-height: 1.6; color: #374151; margin: 8px 0 0;">The Umbil team</p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 16px;" />
      <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
        You received this because you subscribed to ${escapeHtml(planLabel)} at umbil.co.uk
      </p>
    </div>
  `;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send(
    {
      from: FROM,
      replyTo: REPLY_TO,
      to,
      subject: `Welcome to ${planLabel}`,
      html,
    },
    { idempotencyKey: `pro-welcome-${checkoutSessionId}` }
  );

  if (error) {
    console.error("Pro welcome email failed:", error);
    throw error;
  }
};
