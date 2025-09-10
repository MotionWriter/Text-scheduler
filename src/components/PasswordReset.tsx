"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export function PasswordReset() {
  const { signIn } = useAuthActions();
  const [submitting, setSubmitting] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Get token from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    setToken(tokenParam);
  }, []);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Invalid Reset Link
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              This password reset link is invalid or has expired.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Reset Your Password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your new password below
          </p>
        </div>
        <form
          className="mt-8 space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitting(true);
            const formData = new FormData(e.target as HTMLFormElement);
            formData.set("flow", "reset-password");
            formData.set("token", token);
            
            void signIn("password", formData)
              .then(() => {
                toast.success("Password reset successfully! You are now signed in.");
                // Redirect to dashboard or home page
                window.location.href = "/";
              })
              .catch((error) => {
                toast.error("Failed to reset password. The link may have expired.");
                console.error(error);
              })
              .finally(() => {
                setSubmitting(false);
              });
          }}
        >
          <div>
            <input
              className="auth-input-field w-full"
              type="password"
              name="password"
              placeholder="New Password"
              required
              minLength={6}
            />
          </div>
          <div>
            <input
              className="auth-input-field w-full"
              type="password"
              name="confirmPassword"
              placeholder="Confirm New Password"
              required
              minLength={6}
            />
          </div>
          <div>
            <button 
              className="auth-button w-full" 
              type="submit" 
              disabled={submitting}
            >
              {submitting ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}