import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Mail, CheckCircle2 } from 'lucide-react';
import Button from '../components/ui/Button';
import RentXLogo from '../components/ui/RentXLogo';
import { api } from '../lib/api';

type Step = 'email' | 'otp' | 'password' | 'done';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step === 'otp') {
      setResendTimer(60);
      const interval = setInterval(() => {
        setResendTimer(t => (t > 0 ? t - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 3) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (paste.length === 4) {
      setOtp(paste.split(''));
      otpRefs.current[3]?.focus();
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Email is required.'); return; }
    setLoading(true);
    try {
      await api.auth.forgotPassword(email.trim());
      setStep('otp');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError((err as Error).message ?? 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (otp.join('').length < 4) { setError('Enter the 4-digit OTP.'); return; }
    setStep('password');
  };

  const handleResend = async () => {
    setError('');
    setOtp(['', '', '', '']);
    setResendTimer(60);
    try {
      await api.auth.forgotPassword(email.trim());
    } catch (err) {
      setError((err as Error).message ?? 'Failed to resend OTP.');
    }
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newPassword) { setError('New password is required.'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await api.auth.resetPassword(email.trim(), otp.join(''), newPassword);
      setStep('done');
    } catch (err) {
      setError((err as Error).message ?? 'Failed to reset password. Please try again.');
      setStep('otp');
    } finally {
      setLoading(false);
    }
  };

  const STEPS: Step[] = ['email', 'otp', 'password'];
  const stepIdx = STEPS.indexOf(step);

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-cream-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-card-hover border border-cream-300 p-8">

          {step !== 'done' && (
            <>
              {/* Progress indicator */}
              <div className="flex items-center gap-2 mb-8">
                {STEPS.map((s, i) => (
                  <div key={s} className="flex items-center gap-2 flex-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                      step === s ? 'bg-brown-600 text-white' :
                      stepIdx > i ? 'bg-brown-200 text-brown-600' :
                      'bg-cream-300 text-brown-300'
                    }`}>
                      {stepIdx > i ? '✓' : i + 1}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 rounded-full transition-all ${stepIdx > i ? 'bg-brown-300' : 'bg-cream-300'}`} />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-col items-center text-center mb-8">
                <div className="mb-4">
                  <RentXLogo size="lg" />
                </div>
                <h1 className="text-2xl font-semibold text-brown-900">Reset password</h1>
                <p className="text-brown-400 text-sm mt-1">
                  {step === 'email' && 'Enter your registered email to receive an OTP'}
                  {step === 'otp' && `Enter the 4-digit OTP sent to ${email}`}
                  {step === 'password' && 'Choose a strong new password'}
                </p>
              </div>
            </>
          )}

          {/* ── Step 1: Email ── */}
          {step === 'email' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brown-700 mb-1.5">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-field"
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-600">{error}</div>
              )}

              <Button type="submit" loading={loading} className="w-full">
                Send OTP <ArrowRight size={16} />
              </Button>

              <p className="text-center text-sm text-brown-400">
                Remember your password?{' '}
                <Link to="/login" className="text-brown-600 font-medium hover:text-brown-800">Sign in</Link>
              </p>
            </form>
          )}

          {/* ── Step 2: OTP ── */}
          {step === 'otp' && (
            <>
              <div className="mb-6 text-center">
                <div className="inline-flex w-14 h-14 bg-brown-100 rounded-2xl items-center justify-center mb-4">
                  <Mail size={24} className="text-brown-600" />
                </div>
                <p className="text-brown-400 text-sm">
                  Enter the 4-digit OTP sent to <span className="font-medium text-brown-600">{email}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp}>
                <div className="flex gap-2.5 justify-center mb-6" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className="w-12 h-14 text-center text-xl font-semibold bg-cream-100 border-2 border-brown-200 rounded-xl text-brown-900 focus:outline-none focus:border-brown-500 focus:bg-white transition-all"
                    />
                  ))}
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-600 mb-4">{error}</div>
                )}

                <Button type="submit" className="w-full mb-4">
                  Verify OTP <ArrowRight size={16} />
                </Button>

                <div className="text-center text-sm text-brown-400">
                  {resendTimer > 0 ? (
                    <span>Resend OTP in <span className="font-medium text-brown-600">{resendTimer}s</span></span>
                  ) : (
                    <button type="button" onClick={handleResend} className="text-brown-600 font-medium hover:text-brown-800">
                      Resend OTP
                    </button>
                  )}
                </div>

                <div className="text-center mt-2">
                  <button
                    type="button"
                    onClick={() => { setError(''); setStep('email'); }}
                    className="text-xs text-brown-400 hover:text-brown-600 transition-colors"
                  >
                    Wrong email? Go back
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── Step 3: New Password ── */}
          {step === 'password' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brown-700 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="input-field pr-11"
                    autoComplete="new-password"
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brown-400 hover:text-brown-600 transition-colors">
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-brown-700 mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="input-field pr-11"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brown-400 hover:text-brown-600 transition-colors">
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-600">{error}</div>
              )}

              <Button type="submit" loading={loading} className="w-full">
                Reset Password <ArrowRight size={16} />
              </Button>
            </form>
          )}

          {/* ── Done ── */}
          {step === 'done' && (
            <div className="text-center py-6">
              <CheckCircle2 size={56} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-brown-900 mb-2">Password reset!</h2>
              <p className="text-brown-400 text-sm mb-6">Your password has been updated. You can now sign in.</p>
              <Button className="w-full" onClick={() => navigate('/login')}>
                Go to Sign In <ArrowRight size={16} />
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
