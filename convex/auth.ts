import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { query } from "./_generated/server";
import Google from "@auth/core/providers/google";
import { Email } from "@convex-dev/auth/providers/Email";

const RESEND_FROM = process.env.RESEND_FROM ?? "ryan@rplummer.com";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      reset: {
        id: "resend",
        type: "email",
        name: "Resend",
        sendVerificationRequest: async (params) => {
          const { identifier: email, token, url } = params;
          const urlObj = new URL(url);
          const origin = urlObj.origin;
          const rawBase = process.env.APP_ORIGIN ?? origin;
          const base = rawBase.replace(/\/+$/, "");
          const code = urlObj.searchParams.get("code") ?? token;
          const resetLink = `${base}/reset-password?code=${encodeURIComponent(code)}&email=${encodeURIComponent(email)}`;
          
          // Send password reset email using Resend
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: RESEND_FROM,
              to: [email],
              subject: "Reset your password - Men's Study Message Scheduler",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">Reset Your Password</h2>
                  <p>Hello,</p>
                  <p>You requested to reset your password for the Men's Study Message Scheduler. Click the button below to reset your password:</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" 
                       style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                      Reset Password
                    </a>
                  </div>
                  <p>If the button doesn't work, copy and paste this link into your browser:</p>
                  <p style="word-break: break-all; color: #666;">
                    ${resetLink}
                  </p>
                  <p style="color: #666; font-size: 14px;">
                    This link will expire in 1 hour for security reasons.
                  </p>
                  <p style="color: #666; font-size: 14px;">
                    If you didn't request this password reset, you can safely ignore this email.
                  </p>
                </div>
              `,
            }),
          });

          if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to send password reset email: ${error}`);
          }

          return response.json();
        },
      },
    }),
    // Configure Email provider used by password reset links (id must match reset.id)
    Email({
      id: "resend",
      name: "Resend",
      sendVerificationRequest: async (params) => {
        const { identifier: email, token, url } = params;
        const urlObj = new URL(url);
        const origin = urlObj.origin;
        const rawBase = process.env.APP_ORIGIN ?? origin;
        const base = rawBase.replace(/\/+$/, "");
        const code = urlObj.searchParams.get("code") ?? token;
        const resetLink = `${base}/reset-password?code=${encodeURIComponent(code)}&email=${encodeURIComponent(email)}`;
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: RESEND_FROM,
            to: [email],
            subject: "Reset your password - Men's Study Message Scheduler",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">Reset Your Password</h2>
                  <p>Hello,</p>
                  <p>You requested to reset your password for the Men's Study Message Scheduler. Click the button below to reset your password:</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}"
                       style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                      Reset Password
                    </a>
                  </div>
                  <p>If the button doesn't work, copy and paste this link into your browser:</p>
                  <p style="word-break: break-all; color: #666;">${resetLink}</p>
                  <p style="color: #666; font-size: 14px;">This link will expire in 1 hour for security reasons.</p>
                  <p style="color: #666; font-size: 14px;">If you didn't request this password reset, you can safely ignore this email.</p>
                </div>
              `,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Failed to send password reset email: ${error}`);
        }
        return response.json();
      },
    }),
    // Allow linking Google to an existing account with the same email
    Google({ allowDangerousEmailAccountLinking: true }),
  ],
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return user;
  },
});
