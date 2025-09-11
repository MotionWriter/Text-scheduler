"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp" | "forgotPassword">("signIn");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {flow === "forgotPassword" ? (
        <div className="card">
        <form
          className="card-body flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitting(true);
            const formData = new FormData(e.target as HTMLFormElement);
            formData.set("flow", "reset");
            void signIn("password", formData)
              .then(() => {
                toast.success("Password reset email sent! Check your inbox.");
                setFlow("signIn");
              })
              .catch((error) => {
                toast.error("Failed to send password reset email.");
                console.error(error);
              })
              .finally(() => {
                setSubmitting(false);
              });
          }}
        >
          <input
            className="auth-input-field"
            type="email"
            name="email"
            placeholder="Email"
            required
          />
          <button className="auth-button" type="submit" disabled={submitting}>
            Send Reset Email
          </button>
          <div className="text-center text-sm text-secondary">
            <button
              type="button"
              className="text-primary hover:text-primary-hover hover:underline font-medium cursor-pointer"
              onClick={() => setFlow("signIn")}
            >
              Back to sign in
            </button>
          </div>
        </form>
        </div>
      ) : (
        <div className="card">
        <form
          className="card-body flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitting(true);
            const formData = new FormData(e.target as HTMLFormElement);
            formData.set("flow", flow);
            void signIn("password", formData).catch((error) => {
              let toastTitle = "";
              if (error.message.includes("Invalid password")) {
                toastTitle = "Invalid password. Please try again.";
              } else {
                toastTitle =
                  flow === "signIn"
                    ? "Could not sign in, did you mean to sign up?"
                    : "Could not sign up, did you mean to sign in?";
              }
              toast.error(toastTitle);
              setSubmitting(false);
            });
          }}
        >
        <input
          className="auth-input-field"
          type="email"
          name="email"
          placeholder="Email"
          required
        />
        <input
          className="auth-input-field"
          type="password"
          name="password"
          placeholder="Password"
          required
        />
        <button className="auth-button" type="submit" disabled={submitting}>
          {flow === "signIn" ? "Sign in" : "Sign up"}
        </button>
        {flow === "signIn" && (
          <div className="text-center text-sm text-secondary mb-2">
            <button
              type="button"
              className="text-primary hover:text-primary-hover hover:underline font-medium cursor-pointer"
              onClick={() => setFlow("forgotPassword")}
            >
              Forgot password?
            </button>
          </div>
        )}
        <div className="text-center text-sm text-secondary">
          <span>
            {flow === "signIn"
              ? "Don't have an account? "
              : "Already have an account? "}
          </span>
          <button
            type="button"
            className="text-primary hover:text-primary-hover hover:underline font-medium cursor-pointer"
            onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
          >
            {flow === "signIn" ? "Sign up instead" : "Sign in instead"}
          </button>
        </div>
      </form>
      </div>
      )}
    </div>
  );
}
