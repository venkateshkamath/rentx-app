import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Mail, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import LocationAutocomplete from '../components/ui/LocationAutocomplete';
import PasswordChecklist from '../components/ui/PasswordChecklist';
import type { LocationData } from '../types';
import { getPasswordIssues } from '../lib/passwordPolicy';

type Step = 'details' | 'otp' | 'success';

interface FormData {
  name: string;
  username: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  location: LocationData | null;
  password: string;
  confirmPassword: string;
}

const COUNTRY_CODES = [
  { code: '+91', label: 'IN' },
  { code: '+1', label: 'US' },
  { code: '+44', label: 'UK' },
  { code: '+971', label: 'AE' },
  { code: '+65', label: 'SG' },
];

export default function RegisterPage() {
  const { register, sendOtp, verifyOTP } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('details');
  const [form, setForm] = useState<FormData>({
    name: '', username: '', email: '', phoneCountryCode: '+91', phoneNumber: '', location: null, password: '', confirmPassword: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
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
    const phoneDigits = form.phoneNumber.replace(/\D/g, '');
    const fullPhone = `${form.phoneCountryCode}${phoneDigits}`;

    if (!form.name || !form.username || !form.email || !phoneDigits || !form.location || !form.password) {
      setError('All fields are required.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    const passwordIssues = getPasswordIssues(form.password, {
      email: form.email,
      username: form.username,
      name: form.name,
    });
    if (passwordIssues.length > 0) {
      setError(`Password requirement missing: ${passwordIssues[0]}.`);
      return;
    }
    if (phoneDigits.length < 6 || phoneDigits.length > 15 || (form.phoneCountryCode === '+91' && phoneDigits.length !== 10)) {
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
      phone: fullPhone,
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
    setResendTimer(60);
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
    setResendTimer(60);
    setOtp(['', '', '', '']);
    await sendOtp(form.email.toLowerCase().trim());
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-cream-100">
      <div className={`w-full ${step === 'otp' ? 'max-w-2xl' : 'max-w-md'}`}>
        <div className="bg-white rounded-2xl shadow-card-hover border border-cream-200 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-brown-700 via-brown-500 to-accent" />
          <div className={step === 'otp' ? 'px-8 py-10 sm:px-16' : 'p-8'}>

          {/* Progress indicator */}
          {(() => {
            const steps: Step[] = ['details', 'otp', 'success'];
            const labels = ['Details', 'Verify', 'Done'];
            const stepIdx = steps.indexOf(step);
            return (
              <div className="mx-auto mb-8 grid w-full max-w-[21rem] grid-cols-[auto_minmax(3rem,1fr)_auto_minmax(3rem,1fr)_auto] items-start">
                {steps.map((s, i) => (
                  <div key={s} className="contents">
                    <div className="flex min-w-14 flex-col items-center gap-1.5">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                        i < stepIdx   ? 'bg-brown-500 text-white' :
                        i === stepIdx ? 'bg-brown-700 text-white' :
                                        'bg-cream-300 text-brown-400'
                      }`}>
                        {i < stepIdx ? '✓' : i + 1}
                      </div>
                      <span className={`text-center text-xs font-600 ${i === stepIdx ? 'text-brown-700' : 'text-brown-300'}`}>
                        {labels[i]}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`mx-3 mt-3.5 h-0.5 rounded-full transition-all ${i < stepIdx ? 'bg-brown-400' : 'bg-cream-300'}`} />
                    )}
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Step 1: Details */}
          {step === 'details' && (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-800 text-brown-900 tracking-tight">Create account</h1>
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

                <div>
                  <label className="block text-sm font-medium text-brown-700 mb-1.5">Mobile Number</label>
                  <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2">
                    <select
                      value={form.phoneCountryCode}
                      onChange={e => setForm(f => ({ ...f, phoneCountryCode: e.target.value }))}
                      className="input-field px-3"
                      aria-label="Country code"
                    >
                      {COUNTRY_CODES.map(country => (
                        <option key={country.code} value={country.code}>
                          {country.label} {country.code}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={form.phoneNumber}
                      onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value.replace(/[^\d\s-]/g, '') }))}
                      placeholder="98765 43210"
                      className="input-field"
                      autoComplete="tel-national"
                    />
                  </div>
                  <p className="text-xs text-brown-300 mt-1">Saved with country code for calls and chat requests.</p>
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

                <div>
                  <label className="block text-sm font-medium text-brown-700 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Strong password"
                      className="input-field pr-11"
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brown-400 hover:text-brown-600">
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div className="mt-2">
                    <PasswordChecklist
                      password={form.password}
                      context={{ email: form.email, username: form.username, name: form.name }}
                    />
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
              <div className="mx-auto mb-7 max-w-xl text-center">
                <div className="mb-5 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-brown-100">
                  <Mail size={30} className="text-brown-700" />
                </div>
                <h1 className="text-3xl font-800 text-brown-900">Verify your email</h1>
                <p className="mx-auto mt-2 max-w-lg text-brown-500 text-base leading-7">
                  Enter the 4-digit OTP sent to <span className="font-medium text-brown-600">{form.email}</span>
                </p>
              </div>

              <form onSubmit={handleOtpSubmit} className="mx-auto max-w-xl">
                <div className="mb-7 flex justify-center gap-4" onPaste={handleOtpPaste}>
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
                      className="h-16 w-16 rounded-2xl border-2 border-brown-200 bg-cream-100 text-center text-2xl font-semibold text-brown-900 transition-all focus:border-brown-700 focus:bg-white focus:outline-none"
                    />
                  ))}
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-600 mb-4">{error}</div>
                )}

                <Button type="submit" loading={loading} className="mb-5 w-full rounded-2xl" size="lg">
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
    </div>
  );
}
