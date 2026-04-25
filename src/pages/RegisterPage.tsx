import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Mail, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import LocationAutocomplete from '../components/ui/LocationAutocomplete';
import type { LocationData } from '../types';

type Step = 'details' | 'otp' | 'success';

interface FormData {
  name: string;
  username: string;
  email: string;
  phone: string;
  location: LocationData | null;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const { register, sendOtp, verifyOTP } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('details');
  const [form, setForm] = useState<FormData>({
    name: '', username: '', email: '', phone: '', location: null, password: '', confirmPassword: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step === 'otp') {
      const interval = setInterval(() => {
        setResendTimer(t => (t > 0 ? t - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step]);

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.username || !form.email || !form.phone || !form.location || !form.password) {
      setError('All fields are required.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.phone.replace(/\D/g, '').length < 10) {
      setError('Enter a valid phone number.');
      return;
    }
    setLoading(true);
    setError('');

    const regResult = await register({
      name: form.name,
      username: form.username,
      email: form.email.toLowerCase().trim(),
      password: form.password,
      phone: form.phone,
      location: form.location!,
    });

    if (!regResult.ok) {
      setLoading(false);
      setError(regResult.error ?? 'Registration failed. Please try again.');
      return;
    }

    const otpResult = await sendOtp(form.email.toLowerCase().trim());
    setLoading(false);

    if (!otpResult.ok) {
      setError(otpResult.error ?? 'Failed to send OTP. Please try again.');
      return;
    }

    setStep('otp');
    setResendTimer(30);
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
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

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 4) {
      setError('Enter the 4-digit OTP.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await verifyOTP(form.email.toLowerCase().trim(), code);
    setLoading(false);
    if (result.ok) {
      setStep('success');
      setTimeout(() => navigate('/login'), 2500);
    } else {
      setError(result.error ?? 'Incorrect OTP. Please try again.');
    }
  };

  const handleResend = async () => {
    setResendTimer(30);
    setOtp(['', '', '', '']);
    await sendOtp(form.email.toLowerCase().trim());
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-cream-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-card-hover border border-cream-300 p-8">

          {/* Progress indicator */}
          <div className="flex items-center gap-2 mb-8">
            {(['details', 'otp', 'success'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  step === s ? 'bg-brown-600 text-white' :
                  ['details', 'otp', 'success'].indexOf(step) > i ? 'bg-brown-200 text-brown-600' :
                  'bg-cream-300 text-brown-300'
                }`}>
                  {['details', 'otp', 'success'].indexOf(step) > i ? '✓' : i + 1}
                </div>
                {i < 2 && <div className={`flex-1 h-0.5 rounded-full transition-all ${
                  ['details', 'otp', 'success'].indexOf(step) > i ? 'bg-brown-300' : 'bg-cream-300'
                }`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Details */}
          {step === 'details' && (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-semibold text-brown-900">Create account</h1>
                <p className="text-brown-400 text-sm mt-1">Join thousands renting on RentX</p>
              </div>

              <form onSubmit={handleDetailsSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-brown-700 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Alex Rodrigues"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-700 mb-1.5">Username</label>
                    <input
                      type="text"
                      value={form.username}
                      onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                      placeholder="alex_r"
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brown-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="you@example.com"
                    className="input-field"
                    autoComplete="email"
                  />
                  <p className="text-xs text-brown-300 mt-1">OTP will be sent to this email</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-brown-700 mb-1.5">Mobile Number</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+91 98765 43210"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-700 mb-1.5">Location / City</label>
                    <LocationAutocomplete
                      value={form.location}
                      onChange={loc => setForm(f => ({ ...f, location: loc }))}
                      placeholder="Search your city…"
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brown-700 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Min 6 characters"
                      className="input-field pr-11"
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brown-400 hover:text-brown-600">
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brown-700 mb-1.5">Confirm Password</label>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    placeholder="••••••••"
                    className="input-field"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-600">{error}</div>
                )}

                <Button type="submit" loading={loading} className="w-full">
                  Continue <ArrowRight size={16} />
                </Button>
              </form>

              <p className="text-center text-sm text-brown-400 mt-4">
                Already have an account?{' '}
                <Link to="/login" className="text-brown-600 font-medium hover:text-brown-800">Sign in</Link>
              </p>
            </>
          )}

          {/* Step 2: OTP */}
          {step === 'otp' && (
            <>
              <div className="mb-6 text-center">
                <div className="inline-flex w-14 h-14 bg-brown-100 rounded-2xl items-center justify-center mb-4">
                  <Mail size={24} className="text-brown-600" />
                </div>
                <h1 className="text-2xl font-semibold text-brown-900">Verify your email</h1>
                <p className="text-brown-400 text-sm mt-1">
                  Enter the 4-digit OTP sent to <span className="font-medium text-brown-600">{form.email}</span>
                </p>
              </div>

              <form onSubmit={handleOtpSubmit}>
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

                <Button type="submit" loading={loading} className="w-full mb-4">
                  Verify OTP
                </Button>

                <div className="text-center text-sm text-brown-400">
                  {resendTimer > 0 ? (
                    <span>Resend OTP in <span className="font-medium text-brown-600">{resendTimer}s</span></span>
                  ) : (
                    <button onClick={handleResend} className="text-brown-600 font-medium hover:text-brown-800">
                      Resend OTP
                    </button>
                  )}
                </div>
              </form>
            </>
          )}

          {/* Step 3: Success */}
          {step === 'success' && (
            <div className="text-center py-6">
              <CheckCircle2 size={56} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-brown-900 mb-2">Email Verified!</h2>
              <p className="text-brown-400 text-sm">Account created successfully. Redirecting to sign in…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
