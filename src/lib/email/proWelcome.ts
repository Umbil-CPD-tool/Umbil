import { Resend } from "resend";

const FROM = "Umbil <noreply@notifications.umbil.co.uk>";
const DASHBOARD_URL = "https://umbil.co.uk/dashboard";
const BRAND = "#1fb8cd";

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const benefit = (text: string) =>
  `<li style="margin: 0 0 10px; padding: 0; font-size: 15px; line-height: 1.5; color: #1f2937;">${text}</li>`;

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
  const trialLine = isTeam
    ? "Your team subscription is now active."
    : "Your first month is free. You can cancel anytime from Settings \u2192 Manage Subscription.";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 16px; color: #1a1a1a;">
      <p style="font-size: 13px; font-weight: 700; letter-spacing: 0.04em; color: ${BRAND}; margin: 0 0 16px;">UMBIL</p>
      <h1 style="font-size: 24px; font-weight: 800; margin: 0 0 16px; color: #111827;">Welcome to ${escapeHtml(planLabel)}</h1>
      <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 0 0 16px;">${greeting}</p>
      <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 0 0 16px;">
        Thank you for supporting Umbil. We built this so clinicians can answer questions, cut admin, and capture learning without the end-of-year scramble.
      </p>
      <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 0 0 20px;">${trialLine}</p>
      <p style="font-size: 14px; font-weight: 700; color: ${BRAND}; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 12px;">What you can now do</p>
      <ul style="margin: 0 0 24px; padding-left: 20px;">
        ${benefit("Unlimited Capture Learning logs and AI reflection prompts")}
        ${benefit("Unlimited clinical tools \u2014 referrals, safety-netting, SBAR, patient info, translation")}
        ${benefit("Appraisal-ready Patient Feedback (PSQ) and Colleague Feedback (MSF) reports")}
        ${benefit("Automated Personal Development Plan (PDP) generation")}
        ${benefit("Trusted UK guideline-aligned clinical support, with no monthly caps")}
      </ul>
      <p style="margin: 0 0 28px;">
        <a href="${DASHBOARD_URL}" style="display: inline-block; background-color: ${BRAND}; color: #ffffff; font-weight: 700; font-size: 16px; text-decoration: none; padding: 12px 22px; border-radius: 8px;">
          Open Umbil
        </a>
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #374151; margin: 0 0 8px;">
        If anything feels off, reply to this email or use Contact Us in the menu \u2014 we read every message.
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #374151; margin: 0;">Thank you again,<br/>The Umbil team</p>
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
      to,
      subject: `Welcome to ${planLabel} \u2014 thank you`,
      html,
    },
    { idempotencyKey: `pro-welcome-${checkoutSessionId}` }
  );

  if (error) {
    console.error("Pro welcome email failed:", error);
    throw error;
  }
};
