// src/app/api/msf/invite/route.ts
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    try {
        const { email, link, title } = await req.json();

        if (!email || !link) {
            return NextResponse.json({ error: 'Email and link are required' }, { status: 400 });
        }

        // Inline HTML styles ensure high deliverability and consistent rendering across email clients
        const htmlContent = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 16px; color: #1a1a1a;">
                <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 16px; color: #111827;">Feedback Request: ${title}</h2>
                
                <p style="font-size: 16px; line-height: 24px; color: #4b5563; margin-bottom: 24px;">
                    Dear Colleague,
                </p>
                
                <p style="font-size: 16px; line-height: 24px; color: #4b5563; margin-bottom: 32px;">
                    I would be grateful if you could provide some 360-degree feedback for my upcoming appraisal. It is completely anonymous and should only take about 3 minutes of your time. Your honest insights are incredibly valuable for my professional development.
                </p>

                <div style="text-align: center; margin-bottom: 32px;">
                    <a href="${link}" style="display: inline-block; background-color: #1FB8CD; color: #ffffff; font-weight: bold; font-size: 16px; text-decoration: none; padding: 14px 28px; border-radius: 8px;">
                        Complete Feedback Form
                    </a>
                </div>
                
                <p style="font-size: 14px; line-height: 21px; color: #6b7280; margin-bottom: 16px;">
                    If the button above does not work, you can copy and paste the following link into your browser:
                    <br/>
                    <a href="${link}" style="color: #1FB8CD; word-break: break-all;">${link}</a>
                </p>

                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
                
                <p style="font-size: 12px; color: #9ca3af; text-align: center;">
                    Sent securely via Umbil Clinical Tools
                </p>
            </div>
        `;

        const data = await resend.emails.send({
            from: 'Umbil <noreply@notifications.umbil.co.uk>', 
            to: email,
            subject: `Feedback Request for Appraisal: ${title}`,
            html: htmlContent,
        });

        if (data.error) {
            console.error('Resend error:', data.error);
            return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error('Email dispatch exception:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}