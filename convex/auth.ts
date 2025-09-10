import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { query } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      reset: {
        id: "resend",
        type: "email",
        name: "Resend",
        sendVerificationRequest: async (params) => {
          const { identifier: email, token, url } = params;
          
          // Send password reset email using Resend
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "ryan@rplummer.com",
              to: [email],
              subject: "Reset your password - Men's Study Message Scheduler",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">Reset Your Password</h2>
                  <p>Hello,</p>
                  <p>You requested to reset your password for the Men's Study Message Scheduler. Click the button below to reset your password:</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${url}" 
                       style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                      Reset Password
                    </a>
                  </div>
                  <p>If the button doesn't work, copy and paste this link into your browser:</p>
                  <p style="word-break: break-all; color: #666;">
                    ${url}
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
    Anonymous
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
