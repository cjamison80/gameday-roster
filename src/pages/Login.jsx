import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const returnTo = safeReturnTo();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = returnTo;
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", returnTo);
  };

  return (
    <AuthLayout
      panelMode="login"
      kicker="WELCOME BACK"
      title="Sign in to GameDay Roster"
      subtitle="Manage your roster needs, player profile, opportunities, messages, and tournaments."
      footer={
        <>
          New to GameDay Roster?{" "}
          <Link
            to={"/register" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "")}
            className="font-black hover:underline"
            style={{ color: '#C1121F' }}
          >
            Create Account
          </Link>
        </>
      }
    >
      <button
        type="button"
        className="w-full h-13 min-h-[52px] rounded-2xl border flex items-center justify-center gap-3 text-sm font-black uppercase tracking-[0.12em] transition active:scale-[0.98]"
        style={{ borderColor: '#CBD5E1', color: '#0B1528', backgroundColor: '#FFFFFF' }}
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5" />
        Continue with Google
      </button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" style={{ borderColor: '#E2E8F0' }} />
        </div>
        <div className="relative flex justify-center text-[10px] uppercase tracking-[0.18em] font-black">
          <span className="bg-white px-3" style={{ color: '#94A3B8' }}>or sign in with email</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-2xl text-sm font-semibold" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-black uppercase tracking-[0.14em]" style={{ color: '#64748B' }}>
            Email address
          </Label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" color="#94A3B8" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-11 h-[52px] rounded-2xl border text-base"
              style={{ borderColor: '#CBD5E1' }}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-black uppercase tracking-[0.14em]" style={{ color: '#64748B' }}>
              Password
            </Label>
            <Link to="/forgot-password" className="text-xs font-black hover:underline" style={{ color: '#C1121F' }}>
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" color="#94A3B8" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-11 h-[52px] rounded-2xl border text-base"
              style={{ borderColor: '#CBD5E1' }}
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-[52px] rounded-2xl font-black uppercase tracking-[0.14em] text-xs border-0"
          style={{ background: 'linear-gradient(135deg, #C1121F, #8F0F1A)', color: '#FFFFFF' }}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing In...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      <div className="mt-5 rounded-2xl p-4" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
        <p className="text-xs leading-relaxed font-semibold" style={{ color: '#64748B' }}>
          Parent-managed profiles. Coach-driven opportunities. Verified connections for the travel baseball community.
        </p>
      </div>
    </AuthLayout>
  );
}