"use client";

/**
 * Where password-reset and welcome emails land.
 *
 * The API route POST /api/auth/reset-password already existed; this page did
 * not, so every link in those emails 404'd. Both flows share it because both
 * carry a `password_reset` token against an existing user — the email copy
 * differs, the action does not.
 */

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PASSWORD_HINT,
  validatePasswordPolicy,
} from "@/lib/auth/password-policy";

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  // A link with no token cannot be completed; say so up front rather than
  // letting someone type a password and then rejecting it.
  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <AlertCircle className="text-destructive mx-auto h-10 w-10" />
        <h1 className="text-2xl font-bold">This link is incomplete</h1>
        <p className="text-muted-foreground text-sm">
          It&apos;s missing its token, which usually means the email client cut
          the link short. Copy the whole link from the email, or request a new
          one from the sign-in page.
        </p>
        <Button asChild variant="outline">
          <Link href="/auth/signin">Go to sign in</Link>
        </Button>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
        <h1 className="text-2xl font-bold">Password set</h1>
        <p className="text-muted-foreground text-sm">
          You can now sign in with your new password.
        </p>
        <Button onClick={() => router.push("/auth/signin")}>
          Continue to sign in
        </Button>
      </div>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const policyError = validatePasswordPolicy(password);
    if (policyError) {
      setError(`${policyError}.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setStatus("saving");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        setError(
          result?.error ||
            "That link is no longer valid. Request a new one from the sign-in page."
        );
        setStatus("idle");
        return;
      }

      setStatus("done");
    } catch {
      setError("Could not reach the server. Please try again.");
      setStatus("idle");
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold">Choose your password</h1>
        <p className="text-muted-foreground text-sm">
          Pick something you don&apos;t use anywhere else.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <div className="relative">
          <Input
            id="password"
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="text-muted-foreground text-xs">{PASSWORD_HINT}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          type={show ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
      </div>

      {error && (
        <p className="text-destructive flex items-start gap-2 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={status === "saving"}>
        {status === "saving" ? "Saving…" : "Set password"}
      </Button>

      <p className="text-center text-sm">
        <Link href="/auth/signin" className="text-muted-foreground underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      {/* useSearchParams needs a Suspense boundary to avoid opting the whole
          route into client-side rendering at build time. */}
      <Suspense
        fallback={
          <p className="text-muted-foreground text-center text-sm">Loading…</p>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
