// [FIX #5] Suppression du fallback localhost pour APP_URL.
// Avant: Si NEXT_PUBLIC_APP_URL n'était pas défini en production, les liens
// dans les emails (vérification, reset password, suppression de compte)
// pointaient vers http://localhost:3000, rendant ces liens inutilisables
// pour les utilisateurs réels.
// Maintenant: L'application lance une erreur explicite si cette variable
// d'environnement est manquante en production.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
if (!APP_URL && process.env.NODE_ENV === "production") {
  throw new Error(
    "FATAL: NEXT_PUBLIC_APP_URL environment variable is not set. " +
    "Email links (verification, password reset, account deletion) would " +
    "point to an invalid URL. Refusing to send broken emails."
  );
}
// En développement, on tolère le fallback localhost
const RESOLVED_APP_URL = APP_URL || "http://localhost:3000";

// [FIX #13] Import de la fonction d'échappement HTML.
// Les pseudos utilisateurs sont interpolés directement dans les templates
// HTML des emails sans nettoyage, permettant l'injection HTML.
import { escapeHtml } from "@/lib/utils";

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<{ success: boolean; error?: string }> {
  const resetUrl = `${RESOLVED_APP_URL}/reset-password?token=${resetToken}`;
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL || "noreply@postflow.dev";

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey || "",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "PostFlow",
          email: fromEmail,
        },
        to: [
          {
            email: email,
          },
        ],
        subject: "PostFlow - Reset Your Password",
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; background-color: #0a0a0a; color: #fafafa; }
              .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
              .card { background: #171717; border: 1px solid #262626; border-radius: 12px; padding: 32px; color: #fafafa; }
              .button { display: inline-block; background: #f97316; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0; }
              .footer { margin-top: 24px; font-size: 12px; color: #737373; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="card">
                <h1 style="margin:0 0 8px 0; font-size:24px;">Reset Your Password</h1>
                <p style="color:#a3a3a3; margin:0 0 20px 0;">We received a request to reset your PostFlow account password.</p>
                <a href="${resetUrl}" class="button" style="color: #ffffff;">Reset Password</a>
                <p style="color:#a3a3a3; font-size:14px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
              </div>
              <div class="footer">
                <p>PostFlow - LinkedIn Post Manager for Developers</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Brevo API error:", errorText);
      return { success: false, error: `Failed to send email: ${response.statusText}` };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

export async function sendVerificationEmail(
  email: string,
  verificationToken: string
): Promise<{ success: boolean; error?: string }> {
  const verifyUrl = `${RESOLVED_APP_URL}/verify-email?token=${verificationToken}`;
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL || "noreply@postflow.dev";

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey || "",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "PostFlow", email: fromEmail },
        to: [{ email }],
        subject: "PostFlow - Verify Your Email Address",
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; background-color: #0a0a0a; color: #fafafa; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
              .card { background: #171717; border: 1px solid #262626; border-radius: 12px; padding: 32px; }
              .logo { font-size: 20px; font-weight: bold; color: #f97316; margin-bottom: 24px; }
              .title { font-size: 24px; font-weight: bold; margin: 0 0 8px 0; color: #fafafa; }
              .subtitle { color: #a3a3a3; margin: 0 0 24px 0; font-size: 15px; }
              .button { display: inline-block; background: #f97316; color: #ffffff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 8px 0 20px 0; }
              .url-box { background: #262626; border-radius: 6px; padding: 12px; word-break: break-all; font-size: 12px; color: #a3a3a3; margin-top: 16px; }
              .warning { font-size: 13px; color: #737373; margin-top: 16px; }
              .footer { margin-top: 24px; font-size: 12px; color: #525252; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="card">
                <div class="logo">&#9889; PostFlow</div>
                <h1 class="title">Verify Your Email</h1>
                <p class="subtitle">
                  Thanks for signing up! Please verify your email address
                  to activate your PostFlow account.
                </p>
                <a href="${verifyUrl}" class="button">
                  Verify Email Address
                </a>
                <p class="warning">
                  This link expires in <strong>24 hours</strong>.<br/>
                  If you didn't create a PostFlow account, you can safely ignore this email.
                </p>
                <div class="url-box">
                  If the button doesn't work, copy this link:<br/>
                  ${verifyUrl}
                </div>
              </div>
              <div class="footer">
                PostFlow - LinkedIn Post Manager for Developers
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Brevo verification email error:", errorText);
      return { success: false, error: "Failed to send verification email" };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

export async function sendAccountDeletionEmail(
  email: string,
  username: string,
  deletionToken: string
): Promise<{ success: boolean; error?: string }> {
  const confirmUrl = `${RESOLVED_APP_URL}/confirm-delete-account?token=${deletionToken}`;
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL || "noreply@postflow.dev";

  // [FIX #13] Échappement HTML du pseudo pour empêcher l'injection HTML
  // dans les emails. Avant: ${username} était interpolé tel quel, permettant
  // à un pseudo comme <b>admin</b> d'être rendu en HTML dans l'email.
  const safeUsername = escapeHtml(username);

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey || "",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "PostFlow", email: fromEmail },
        to: [{ email }],
        subject: "PostFlow - Confirm Account Deletion",
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; background-color: #0a0a0a; color: #fafafa; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
              .card { background: #171717; border: 1px solid #262626; border-radius: 12px; padding: 32px; }
              .logo { font-size: 20px; font-weight: bold; color: #f97316; margin-bottom: 24px; }
              .title { font-size: 24px; font-weight: bold; margin: 0 0 8px 0; color: #fafafa; }
              .subtitle { color: #a3a3a3; margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; }
              .warning-box { background: #2d1515; border: 1px solid #7f1d1d; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
              .warning-title { color: #ef4444; font-weight: bold; font-size: 14px; margin-bottom: 8px; }
              .warning-list { color: #fca5a5; font-size: 13px; padding-left: 16px; margin: 0; line-height: 1.8; }
              .button { display: inline-block; background: #ef4444; color: #ffffff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 8px 0 20px 0; }
              .url-box { background: #262626; border-radius: 6px; padding: 12px; word-break: break-all; font-size: 12px; color: #a3a3a3; margin-top: 16px; }
              .expire { font-size: 13px; color: #737373; margin-top: 16px; padding-top: 16px; border-top: 1px solid #262626; }
              .ignore { font-size: 13px; color: #737373; margin-top: 12px; }
              .footer { margin-top: 24px; font-size: 12px; color: #525252; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="card">
                <div class="logo">&#9889; PostFlow</div>
                <h1 class="title">Account Deletion Request</h1>
                <p class="subtitle">
                  Hi <strong style="color:#fafafa;">${safeUsername}</strong>, we received a request
                  to permanently delete your PostFlow account.
                </p>

                <div class="warning-box">
                  <div class="warning-title">&#9888;&#65039; This action is irreversible</div>
                  <ul class="warning-list">
                    <li>All your projects will be deleted</li>
                    <li>All your posts will be deleted</li>
                    <li>All your tags will be deleted</li>
                    <li>Your account cannot be recovered</li>
                  </ul>
                </div>

                <p style="color:#a3a3a3; font-size:14px; margin-bottom:16px;">
                  If you really want to delete your account, click the button below:
                </p>

                <a href="${confirmUrl}" class="button">
                  Yes, Delete My Account
                </a>

                <div class="expire">
                  &#9201;&#65039; This link expires in <strong style="color:#fafafa;">1 hour</strong>.
                  After that, your account will remain active.
                </div>

                <div class="ignore">
                  &#128274; If you did NOT request this deletion, your account is safe.
                  Simply ignore this email and change your password immediately.
                </div>

                <div class="url-box">
                  If the button doesn't work, copy this link:<br/>
                  ${confirmUrl}
                </div>
              </div>
              <div class="footer">
                PostFlow - LinkedIn Post Manager for Developers
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Brevo deletion email error:", errorText);
      return { success: false, error: "Failed to send confirmation email" };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}
