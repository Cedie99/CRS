import nodemailer from "nodemailer";

export type WorkflowEmailJob = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export interface EmailContentOpts {
  name: string;
  title: string;
  body: string;
  cisId: string;
  reviewUrl?: string | null;
  ctaLabel?: string;
  accentColor?: string;
  details?: Array<{ label: string; value: string }>;
  statusBadge?: { label: string; color: string };
}

export function buildEmailHtml({
  name,
  title,
  body,
  cisId,
  reviewUrl,
  ctaLabel = "View Form",
  accentColor = "#0f2340",
  details,
  statusBadge,
}: EmailContentOpts): string {
  const btn = reviewUrl
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:28px;">
        <tr><td align="center">
          <a href="${reviewUrl}"
            style="display:inline-block;background:${accentColor};color:#ffffff;text-decoration:none;
                   padding:13px 36px;border-radius:6px;font-size:14px;font-weight:700;letter-spacing:0.4px;">
            ${ctaLabel} &rarr;
          </a>
        </td></tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#eef1f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
    style="background-color:#eef1f6;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="580" cellspacing="0" cellpadding="0"
        style="max-width:580px;width:100%;border-radius:10px;overflow:hidden;
               box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Accent bar -->
        <tr>
          <td style="background:${accentColor};height:5px;"></td>
        </tr>

        <!-- Header -->
        <tr>
          <td style="background:#0f2340;padding:28px 40px 24px;text-align:center;">
            <p style="margin:0 0 6px;color:#d4960a;font-size:10px;font-weight:700;
                      letter-spacing:3px;text-transform:uppercase;">
              Oracle Petroleum &middot; Toll Blend Division
            </p>
            <p style="margin:0;color:#ffffff;font-size:21px;font-weight:700;letter-spacing:0.2px;">
              Customer Registration System
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:36px 40px 32px;">
            <p style="margin:0 0 4px;color:#aaa;font-size:11px;font-weight:700;
                      text-transform:uppercase;letter-spacing:1.5px;">
              Notification
            </p>
            <p style="margin:0 0 24px;color:#0f2340;font-size:20px;font-weight:700;line-height:1.3;
                      border-bottom:2px solid #eef1f6;padding-bottom:20px;">
              ${title}
            </p>

            <p style="margin:0 0 4px;color:#333;font-size:14px;">
              Hello <strong>${name}</strong>,
            </p>
            <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.75;">
              ${body}
            </p>

            ${statusBadge ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
              <tr><td>
                <span style="display:inline-block;background:${statusBadge.color};color:#ffffff;font-size:11px;font-weight:700;
                             letter-spacing:0.8px;text-transform:uppercase;padding:5px 14px;border-radius:4px;">
                  ${statusBadge.label}
                </span>
              </td></tr>
            </table>` : ""}

            ${details && details.length > 0 ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0"
              style="margin-bottom:24px;border:1px solid #e3e7ef;border-radius:8px;overflow:hidden;">
              ${details.map((d, i) => `<tr>
                <td style="background:${i % 2 === 0 ? "#f8f9fb" : "#ffffff"};padding:10px 16px;width:40%;vertical-align:top;">
                  <p style="margin:0;color:#888;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">${d.label}</p>
                </td>
                <td style="background:${i % 2 === 0 ? "#f8f9fb" : "#ffffff"};padding:10px 16px;vertical-align:top;">
                  <p style="margin:0;color:#333;font-size:13px;font-weight:600;">${d.value}</p>
                </td>
              </tr>`).join("")}
            </table>` : ""}

            <!-- CIS reference -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="background:#f8f9fb;border:1px solid #e3e7ef;
                           border-left:4px solid ${accentColor};
                           border-radius:0 6px 6px 0;padding:14px 18px;">
                  <p style="margin:0 0 4px;color:#999;font-size:10px;font-weight:700;
                            text-transform:uppercase;letter-spacing:1.2px;">
                    CIS Reference ID
                  </p>
                  <p style="margin:0;color:#0f2340;font-size:12px;
                            font-family:'Courier New',Courier,monospace;font-weight:700;
                            letter-spacing:0.5px;">
                    ${cisId}
                  </p>
                </td>
              </tr>
            </table>

            ${btn}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f4f6f9;border-top:1px solid #e8ecf2;padding:18px 40px;text-align:center;">
            <p style="margin:0 0 3px;color:#aaa;font-size:11px;">
              This is an automated notification from the Oracle Petroleum Customer Registration System.
            </p>
            <p style="margin:0;color:#ccc;font-size:11px;">Please do not reply to this email.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return transporter;
}

export async function sendWorkflowEmails(jobs: WorkflowEmailJob[]) {
  if (jobs.length === 0) return;

  const smtp = getTransporter();
  const from = process.env.GMAIL_USER;
  if (!smtp || !from) {
    console.warn("[email] Skipping email send. Missing GMAIL_USER or GMAIL_APP_PASSWORD.");
    return;
  }

  const deduped = Array.from(
    new Map(jobs.map((job) => [`${job.to}|${job.subject}`, job])).values()
  );

  const results = await Promise.allSettled(
    deduped.map((job) =>
      smtp.sendMail({
        from: `"CRS - Oracle Petroleum" <${from}>`,
        to: job.to,
        subject: job.subject,
        text: job.text,
        html: job.html,
      })
    )
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      const failed = deduped[index];
      console.error("[email] Failed to send workflow email", {
        to: failed?.to,
        subject: failed?.subject,
        error: result.reason,
      });
    }
  });
}
