
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "signup" | "login" | "forgot" | "reset";

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("type") === "recovery") {
      setMode("reset");
    }

    if (params.get("error") === "callback_failed") {
      setError(
        "The authentication link could not be verified. Please request a new link and try again."
      );
    }
  }, []);

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const supabase = createClient();

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
          },
        });

        if (error) throw error;

        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setMessage(
            "Account created. Check your email to confirm your account, then sign in."
          );
        }
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        router.replace("/");
        router.refresh();
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: `${window.location.origin}/auth/callback?next=/auth?type=recovery`,
          }
        );

        if (error) throw error;

        setMessage(
          "If an account exists for that email, a password reset link will be sent. Check your inbox."
        );
      } else {
        if (password.length < 6) {
          throw new Error(
            "Your new password must contain at least 6 characters."
          );
        }

        if (password !== confirmPassword) {
          throw new Error("The passwords do not match.");
        }

        const { error } = await supabase.auth.updateUser({ password });

        if (error) throw error;

        await supabase.auth.signOut();
        setPassword("");
        setConfirmPassword("");
        changeMode("login");
        setMessage(
          "Password updated successfully. Please sign in with your new password."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete your request. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const heading = {
    signup: "Create your account",
    login: "Welcome back",
    forgot: "Reset your password",
    reset: "Set a new password",
  }[mode];

  const description = {
    signup: "Create an account to get started with RankPilot.",
    login: "Sign in to continue to your workspace.",
    forgot: "Enter your email and we'll send you a password reset link.",
    reset: "Choose a new password for your RankPilot account.",
  }[mode];

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080b12] px-5 py-10 text-slate-100">
      <div className="w-full max-w-md">
        <a href="/" className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-300 text-xl font-black text-slate-950">
            R
          </div>
          <div>
            <div className="text-xl font-bold">RankPilot</div>
            <div className="text-xs text-slate-500">SEO intelligence</div>
          </div>
        </a>

        <div className="rounded-2xl border border-white/[0.09] bg-[#0d111b] p-7 sm:p-9">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
            Your SEO workspace
          </p>

          <h1 className="text-2xl font-semibold">{heading}</h1>

          <p className="mb-7 mt-2 text-sm leading-6 text-slate-400">
            {description}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode !== "reset" && (
              <label className="block text-sm text-slate-300">
                Email address
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-cyan-300/60"
                />
              </label>
            )}

            {mode !== "forgot" && (
              <label className="block text-sm text-slate-300">
                {mode === "reset" ? "New password" : "Password"}
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={
                    mode === "signup" || mode === "reset"
                      ? "new-password"
                      : "current-password"
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-cyan-300/60"
                />
              </label>
            )}

            {mode === "reset" && (
              <label className="block text-sm text-slate-300">
                Confirm new password
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Enter the new password again"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-cyan-300/60"
                />
              </label>
            )}

            {mode === "login" && (
              <div className="-mt-2 text-right">
                <button
                  type="button"
                  onClick={() => changeMode("forgot")}
                  className="text-sm text-cyan-300 hover:text-cyan-200"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300"
              >
                {error}
              </p>
            )}

            {message && (
              <p
                role="status"
                className="rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-3 text-sm leading-6 text-cyan-200"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-cyan-300 px-4 py-3.5 text-sm font-bold text-slate-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Please wait..."
                : {
                    signup: "Create account",
                    login: "Sign in",
                    forgot: "Send reset link",
                    reset: "Update password",
                  }[mode]}
            </button>
          </form>

          <div className="mt-6 border-t border-white/[0.07] pt-5 text-center text-sm text-slate-400">
            {mode === "reset" || mode === "forgot" ? (
              <button
                type="button"
                onClick={() => changeMode("login")}
                className="font-semibold text-cyan-300"
              >
                Back to sign in
              </button>
            ) : (
              <>
                {mode === "signup"
                  ? "Already have an account?"
                  : "New to RankPilot?"}{" "}
                <button
                  type="button"
                  onClick={() =>
                    changeMode(mode === "signup" ? "login" : "signup")
                  }
                  className="font-semibold text-cyan-300 hover:text-cyan-200"
                >
                  {mode === "signup" ? "Sign in" : "Create account"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
