import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2, Users, Trophy, Building2, CheckCircle2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { toast } from "@/components/ui/use-toast";
import { safeReturnTo } from "@/lib/authReturnTo";

const accountRoles = [
  {
    id: 'parent',
    title: 'Parent / Player',
    description: 'Create player profiles, set availability, and find pickup opportunities.',
    icon: Users
  },
  {
    id: 'coach',
    title: 'Coach',
    description: 'Post roster needs, review applicants, and find available players.',
    icon: Trophy
  },
  {
    id: 'organization',
    title: 'Organization',
    description: 'Manage teams, coaches, roster needs, and tournament discovery.',
    icon: Building2
  }
];

export default function Register() {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') || localStorage.getItem('gdr_selected_role') || 'parent';
  const [selectedRole, setSelectedRole] = useState(accountRoles.some(r => r.id === initialRole) ? initialRole : 'parent');
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const returnTo = safeReturnTo();

  const saveSelectedRole = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (!currentUser?.id) return;
      const existing = await base44.entities.UserProfile.filter({ user_id: currentUser.id }).catch(() => []);
      const payload = {
        user_id: currentUser.id,
        role: selectedRole,
        onboarding_complete: false,
        onboarding_step: 1
      };
      if (existing.length > 0) {
        await base44.entities.UserProfile.update(existing[0].id, payload);
      } else {
        await base44.entities.UserProfile.create(payload);
      }
    } catch (e) {
      // Onboarding will ask for role again if the profile write fails.
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      localStorage.setItem('gdr_selected_role', selectedRole);
      await base44.auth.register({ email, password });
      setShowOtp(true);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
      }
      await saveSelectedRole();
      window.location.href = `/welcome?role=${encodeURIComponent(selectedRole)}`;
    } catch (err) {
      setError(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast({ title: "Code sent", description: "Check your email for the new code." });
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

  const handleGoogle = () => {
    localStorage.setItem('gdr_selected_role', selectedRole);
    base44.auth.loginWithProvider("google", `/welcome?role=${encodeURIComponent(selectedRole)}`);
  };

  if (showOtp) {
    return (
      <AuthLayout
        panelMode="register"
        kicker="VERIFY EMAIL"
        title="Check your inbox"
        subtitle={`We sent a six-digit verification code to ${email}.`}
      >
        {error && (
          <div className="mb-4 p-3 rounded-2xl text-sm font-semibold" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
            {error}
          </div>
        )}
        <div className="flex justify-center mb-6">
          <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button
          className="w-full h-[52px] rounded-2xl font-black uppercase tracking-[0.14em] text-xs border-0"
          style={{ background: 'linear-gradient(135deg, #C1121F, #8F0F1A)', color: '#FFFFFF' }}
          onClick={handleVerify}
          disabled={loading || otpCode.length < 6}
        >
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</> : "Verify & Continue"}
        </Button>
        <p className="text-center text-sm mt-4" style={{ color: '#64748B' }}>
          Didn't receive the code?{" "}
          <button onClick={handleResend} className="font-black hover:underline" style={{ color: '#C1121F' }}>
            Resend
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      panelMode="register"
      kicker="CREATE ACCOUNT"
      title="Start building your roster network."
      subtitle="Choose how you’ll use GameDay Roster, then create your free account."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to={"/login" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "")}
            className="font-black hover:underline"
            style={{ color: '#C1121F' }}
          >
            Sign In
          </Link>
        </>
      }
    >
      <div className="space-y-3 mb-6">
        {accountRoles.map(role => {
          const Icon = role.icon;
          const active = selectedRole === role.id;
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => setSelectedRole(role.id)}
              className="w-full text-left rounded-2xl border p-4 flex gap-3 items-start transition active:scale-[0.99]"
              style={{
                borderColor: active ? '#C1121F' : '#E2E8F0',
                backgroundColor: active ? '#FFF1F2' : '#FFFFFF',
                boxShadow: active ? '0 12px 30px rgba(193,18,31,0.12)' : 'none'
              }}
            >
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: active ? '#C1121F' : '#F1F5F9' }}>
                <Icon size={20} color={active ? '#FFFFFF' : '#0B1528'} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-black text-sm" style={{ color: '#0B1528' }}>{role.title}</h3>
                  {active && <CheckCircle2 size={18} color="#C1121F" />}
                </div>
                <p className="text-xs leading-relaxed mt-1" style={{ color: '#64748B' }}>{role.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="w-full min-h-[52px] rounded-2xl border flex items-center justify-center gap-3 text-sm font-black uppercase tracking-[0.12em] transition active:scale-[0.98] mb-6"
        style={{ borderColor: '#CBD5E1', color: '#0B1528', backgroundColor: '#FFFFFF' }}
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5" />
        Continue with Google
      </button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t" style={{ borderColor: '#E2E8F0' }} /></div>
        <div className="relative flex justify-center text-[10px] uppercase tracking-[0.18em] font-black">
          <span className="bg-white px-3" style={{ color: '#94A3B8' }}>or create with email</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-2xl text-sm font-semibold" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-xs font-black uppercase tracking-[0.14em]" style={{ color: '#64748B' }}>Full name</Label>
          <Input
            id="fullName"
            type="text"
            autoComplete="name"
            placeholder="Caleb Jamison"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="h-[52px] rounded-2xl border text-base"
            style={{ borderColor: '#CBD5E1' }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-black uppercase tracking-[0.14em]" style={{ color: '#64748B' }}>Email address</Label>
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
          <Label htmlFor="password" className="text-xs font-black uppercase tracking-[0.14em]" style={{ color: '#64748B' }}>Password</Label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" color="#94A3B8" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-11 h-[52px] rounded-2xl border text-base"
              style={{ borderColor: '#CBD5E1' }}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm" className="text-xs font-black uppercase tracking-[0.14em]" style={{ color: '#64748B' }}>Confirm password</Label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" color="#94A3B8" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating Account...</> : "Create Account"}
        </Button>
      </form>

      <p className="text-[11px] leading-relaxed mt-5" style={{ color: '#94A3B8' }}>
        Start free. Upgrade when you need more exposure, unlimited applications, or advanced roster tools. By creating an account, you agree to GameDay Roster’s Terms and Privacy Policy.
      </p>
    </AuthLayout>
  );
}