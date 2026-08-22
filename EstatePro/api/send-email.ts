import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { leadName, phone, email, intent, location, budget, timeline, financing, bedrooms, zipCode, listingPreference, contactPreference, bestTime, analysis } = req.body;

  if (!phone || !leadName) {
    return res.status(400).json({ error: 'Missing required fields: leadName and phone' });
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    return res.status(500).json({ error: 'Email configuration missing on server' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #7f1d1d; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">New EstatePro Lead</h2>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background: #fef2f2;">
          <td style="padding: 10px; font-weight: bold; border: 1px solid #fecaca;">Name</td>
          <td style="padding: 10px; border: 1px solid #fecaca;">${leadName}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold; border: 1px solid #fecaca;">Phone</td>
          <td style="padding: 10px; border: 1px solid #fecaca;">${phone}</td>
        </tr>
        <tr style="background: #fef2f2;">
          <td style="padding: 10px; font-weight: bold; border: 1px solid #fecaca;">Email</td>
          <td style="padding: 10px; border: 1px solid #fecaca;">${email || 'Not provided'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold; border: 1px solid #fecaca;">Intent</td>
          <td style="padding: 10px; border: 1px solid #fecaca;">${intent || 'Not specified'}</td>
        </tr>
        <tr style="background: #fef2f2;">
          <td style="padding: 10px; font-weight: bold; border: 1px solid #fecaca;">Location</td>
          <td style="padding: 10px; border: 1px solid #fecaca;">${location || 'Not specified'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold; border: 1px solid #fecaca;">Budget</td>
          <td style="padding: 10px; border: 1px solid #fecaca;">${budget || 'Not specified'}</td>
        </tr>
        <tr style="background: #fef2f2;">
          <td style="padding: 10px; font-weight: bold; border: 1px solid #fecaca;">Timeline</td>
          <td style="padding: 10px; border: 1px solid #fecaca;">${timeline || 'Not specified'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold; border: 1px solid #fecaca;">Financing</td>
          <td style="padding: 10px; border: 1px solid #fecaca;">${financing || 'N/A'}</td>
        </tr>
        <tr style="background: #fef2f2;">
          <td style="padding: 10px; font-weight: bold; border: 1px solid #fecaca;">Bedrooms</td>
          <td style="padding: 10px; border: 1px solid #fecaca;">${bedrooms || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold; border: 1px solid #fecaca;">Zip Code</td>
          <td style="padding: 10px; border: 1px solid #fecaca;">${zipCode || 'N/A'}</td>
        </tr>
        <tr style="background: #fef2f2;">
          <td style="padding: 10px; font-weight: bold; border: 1px solid #fecaca;">Listing Preference</td>
          <td style="padding: 10px; border: 1px solid #fecaca;">${listingPreference || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold; border: 1px solid #fecaca;">Contact Preference</td>
          <td style="padding: 10px; border: 1px solid #fecaca;">${contactPreference || 'Not specified'}</td>
        </tr>
        <tr style="background: #fef2f2;">
          <td style="padding: 10px; font-weight: bold; border: 1px solid #fecaca;">Best Time to Contact</td>
          <td style="padding: 10px; border: 1px solid #fecaca;">${bestTime || 'Not specified'}</td>
        </tr>
      </table>

      <h3 style="color: #7f1d1d; margin-top: 30px;">Chat Analysis</h3>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">
${analysis || 'No analysis available'}
      </div>

      <p style="color: #94a3b8; font-size: 12px; margin-top: 30px; text-align: center;">Sent by EstatePro AI Assistant</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"EstatePro AI" <${gmailUser}>`,
      to: 'subnest.ai@gmail.com',
      subject: `New EstatePro Lead: ${leadName}`,
      html: htmlBody,
    });

    return res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (error: any) {
    console.error('Email send error:', error);
    return res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
}
