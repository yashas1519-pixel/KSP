import "server-only";

import nodemailer from "nodemailer";

const ROLE_LABELS_BILINGUAL: Record<string, { en: string; kn: string }> = {
  SUPER_ADMIN: { en: "Super Admin", kn: "ಸೂಪರ್ ಅಡ್ಮಿನ್" },
  PRISON_HEAD: { en: "Prison Head", kn: "ಜೈಲು ಮುಖ್ಯಸ್ಥರು" },
  STAFF: { en: "Staff", kn: "ಸಿಬ್ಬಂದಿ" },
};

interface WelcomeEmailData {
  fullNameEn: string;
  email: string;
  generatedPassword: string;
  role: string;
  prisonName?: string;
}

function getTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

function buildWelcomeEmailHtml(data: WelcomeEmailData): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const loginUrl = `${appUrl}/login`;
  const roleLabel = ROLE_LABELS_BILINGUAL[data.role] || { en: data.role, kn: data.role };
  const prisonSection = data.prisonName
    ? `<tr>
        <td style="padding:8px 16px;color:#64748b;font-size:14px;border-bottom:1px solid #f1f5f9;">Prison / ಕಾರಾಗೃಹ</td>
        <td style="padding:8px 16px;font-size:14px;font-weight:600;color:#1e293b;border-bottom:1px solid #f1f5f9;">${data.prisonName}</td>
       </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background-color:#1A3C6B;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">
              ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್ — KSP Fitness
            </h1>
            <p style="margin:6px 0 0;color:#94a3b8;font-size:13px;">
              Karnataka State Police — KSP Fitness
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 4px;color:#1e293b;font-size:16px;">Dear <strong>${data.fullNameEn}</strong>,</p>
            <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
              Your KSP Fitness account has been created.<br/>
              ನಿಮ್ಮ KSP Fitness ಖಾತೆ ರಚಿಸಲಾಗಿದೆ.
            </p>

            <!-- Credentials Box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:8px 16px;color:#64748b;font-size:14px;border-bottom:1px solid #f1f5f9;">Login URL</td>
                <td style="padding:8px 16px;font-size:14px;border-bottom:1px solid #f1f5f9;">
                  <a href="${loginUrl}" style="color:#1A3C6B;font-weight:600;text-decoration:none;">${loginUrl}</a>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 16px;color:#64748b;font-size:14px;border-bottom:1px solid #f1f5f9;">Email / ಇಮೇಲ್</td>
                <td style="padding:8px 16px;font-size:14px;font-weight:600;color:#1e293b;border-bottom:1px solid #f1f5f9;">${data.email}</td>
              </tr>
              <tr>
                <td style="padding:8px 16px;color:#64748b;font-size:14px;border-bottom:1px solid #f1f5f9;">Password / ಪಾಸ್ವರ್ಡ್</td>
                <td style="padding:8px 16px;font-size:14px;font-weight:700;color:#dc2626;border-bottom:1px solid #f1f5f9;font-family:monospace;letter-spacing:1px;">${data.generatedPassword}</td>
              </tr>
              <tr>
                <td style="padding:8px 16px;color:#64748b;font-size:14px;border-bottom:1px solid #f1f5f9;">Role / ಪಾತ್ರ</td>
                <td style="padding:8px 16px;font-size:14px;font-weight:600;color:#1e293b;border-bottom:1px solid #f1f5f9;">${roleLabel.en} / ${roleLabel.kn}</td>
              </tr>
              ${prisonSection}
            </table>

            <!-- Warning -->
            <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:16px;margin-bottom:24px;">
              <p style="margin:0;font-size:14px;font-weight:700;color:#92400e;">
                ⚠️ IMPORTANT: Please change your password after your first login.
              </p>
              <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#92400e;">
                ⚠️ ಮುಖ್ಯ: ಮೊದಲ ಲಾಗಿನ್ ನಂತರ ನಿಮ್ಮ ಪಾಸ್ವರ್ಡ್ ಬದಲಾಯಿಸಿ.
              </p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              This is an automated message from KSP Fitness.<br/>
              ಇದು KSP Fitness ನಿಂದ ಸ್ವಯಂಚಾಲಿತ ಸಂದೇಶ.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Sends a bilingual welcome email with login credentials to a new user.
 * @returns true if email was sent successfully, false otherwise.
 */
export async function sendWelcomeEmail(
  to: string,
  data: WelcomeEmailData
): Promise<boolean> {
  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from: `"KSP Fitness" <${process.env.GMAIL_USER}>`,
      to,
      subject:
        "KSP Fitness — Your Login Credentials | ನಿಮ್ಮ ಲಾಗಿನ್ ವಿವರಗಳು",
      html: buildWelcomeEmailHtml(data),
    });

    return true;
  } catch {
    // Email send failed — caller should handle gracefully
    return false;
  }
}
