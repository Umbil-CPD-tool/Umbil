// src/app/api/msf/invite/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';
import { CORS_HEADERS, corsPreflight } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { isSingleEmailAddress } from '@/lib/security';

const resend = new Resend(process.env.RESEND_API_KEY);

/** Escapes values interpolated into the email HTML, which is built by hand rather than by a renderer. */
const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

/**
 * The invite link is emailed from our own domain, so an arbitrary URL here would
 * turn this route into a phishing relay trading on Umbil's sending reputation.
 * Only links to a public MSF cycle on this deployment are accepted.
 *
 * Anchored to where this app is served, not to the request's Origin header: the
 * mobile app calls from a different origin by design, and an attacker controls
 * their own Origin anyway.
 */
const isAllowedInviteLink = (link: string, req: NextRequest): boolean => {
    const allowedOrigins = [process.env.NEXT_PUBLIC_SITE_URL, req.nextUrl.origin]
        .filter((value): value is string => Boolean(value))
        .map((value) => {
            try {
                return new URL(value).origin;
            } catch {
                return null;
            }
        })
        .filter((value): value is string => value !== null);

    try {
        const target = new URL(link);
        return allowedOrigins.includes(target.origin) && target.pathname.startsWith('/m/');
    } catch {
        return false;
    }
};

export const OPTIONS = corsPreflight;

export async function POST(req: NextRequest) {
    try {
        const token = req.headers.get('authorization')?.split('Bearer ')[1];
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
        }

        if (!checkRateLimit(`msf-invite:${user.id}`, 40)) {
            return NextResponse.json({ error: "Too many invites. Please try again later." }, { status: 429, headers: CORS_HEADERS });
        }

        const { email, link, title } = await req.json();

        if (!email || !link) {
            return NextResponse.json({ error: 'Email and link are required' }, { status: 400, headers: CORS_HEADERS });
        }

        // One colleague per request, so the rate limit above caps emails and not just calls.
        if (!isSingleEmailAddress(email)) {
            return NextResponse.json({ error: 'Enter a single valid email address' }, { status: 400, headers: CORS_HEADERS });
        }

        if (!isAllowedInviteLink(link, req)) {
            return NextResponse.json({ error: 'Invalid invite link' }, { status: 400, headers: CORS_HEADERS });
        }

        const safeLink = escapeHtml(link);
        // Newlines are stripped so the title cannot break out of the subject line.
        const inviteTitle =
            typeof title === 'string' && title.trim() ? title.replace(/[\r\n]+/g, ' ').trim() : 'Appraisal Feedback';
        const safeTitle = escapeHtml(inviteTitle);

        // Inline HTML styles ensure high deliverability and consistent rendering across email clients
        const htmlContent = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 16px; color: #1a1a1a;">
                <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 16px; color: #111827;">Feedback Request: ${safeTitle}</h2>
                
                <p style="font-size: 16px; line-height: 24px; color: #4b5563; margin-bottom: 24px;">
                    Dear Colleague,
                </p>
                
                <p style="font-size: 16px; line-height: 24px; color: #4b5563; margin-bottom: 32px;">
                    I would be grateful if you could provide some 360-degree feedback for my upcoming appraisal. It is completely anonymous and should only take about 3 minutes of your time. Your honest insights are incredibly valuable for my professional development.
                </p>

                <div style="text-align: center; margin-bottom: 32px;">
                    <a href="${safeLink}" style="display: inline-block; background-color: #1FB8CD; color: #ffffff; font-weight: bold; font-size: 16px; text-decoration: none; padding: 14px 28px; border-radius: 8px;">
                        Complete Feedback Form
                    </a>
                </div>
                
                <p style="font-size: 14px; line-height: 21px; color: #6b7280; margin-bottom: 16px;">
                    If the button above does not work, you can copy and paste the following link into your browser:
                    <br/>
                    <a href="${safeLink}" style="color: #1FB8CD; word-break: break-all;">${safeLink}</a>
                </p>

                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
                
                <p style="font-size: 12px; color: #9ca3af; text-align: center;">
                    Sent securely via Umbil Clinical Tools
                </p>
            </div>
        `;

        const data = await resend.emails.send({
            from: 'Umbil <noreply@notifications.umbil.co.uk>', 
            to: email.trim(),
            subject: `Feedback Request for Appraisal: ${inviteTitle}`,
            html: htmlContent,
        });

        if (data.error) {
            console.error('Resend error:', data.error);
            return NextResponse.json({ error: 'Failed to send email' }, { status: 500, headers: CORS_HEADERS });
        }

        return NextResponse.json({ success: true, data }, { headers: CORS_HEADERS });

    } catch (error) {
        console.error('Email dispatch exception:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: CORS_HEADERS });
    }
}