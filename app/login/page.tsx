"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isSignUp) {
        const { error: signUpError } = await authClient.signUp.email({
          email,
          password,
          name: email.split("@")[0], // Fallback name
        });
        if (signUpError) {
          throw new Error(signUpError.message || "Sign up failed");
        }
      } else {
        const { error: signInError } = await authClient.signIn.email({
          email,
          password,
        });
        if (signInError) {
          throw new Error(signInError.message || "Sign in failed");
        }
      }

      // Redirect to sessions page on success
      router.push("/sessions");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl">
        <h1 className="mb-2 text-3xl font-bold text-white">ScribeAI</h1>
        <p className="mb-8 text-sm text-white/60">
          AI-powered meeting transcription
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-2 block text-sm font-medium text-white/80"
              htmlFor="email"
            >
              Email
            </label>
            <input
              required
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-white/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              id="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              type="email"
              value={email}
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-white/80"
              htmlFor="password"
            >
              Password
            </label>
            <input
              required
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-white/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              id="password"
              minLength={6}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              type="password"
              value={password}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <Button className="w-full" disabled={loading} type="submit">
            {loading
              ? "Loading..."
              : isSignUp
                ? "Sign Up"
                : "Sign In"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            className="text-sm text-white/60 hover:text-white/80"
            onClick={() => setIsSignUp(!isSignUp)}
            type="button"
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
