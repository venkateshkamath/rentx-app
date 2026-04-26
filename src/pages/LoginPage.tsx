import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import RentXLogo from '../components/ui/RentXLogo';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');
    const ok = await login(form.email.trim(), form.password);
    setLoading(false);
    if (ok) navigate('/');
    else setError('Invalid email or password. Make sure your email is verified.');
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-stretch bg-cream-100">
      {/* Left panel – decorative */}
      <div className="hidden lg:flex lg:w-[45%] flex-col items-center justify-center bg-brown-900 px-12 py-16 relative overflow-hidden">
        {/* dot grid */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle, #FAF7F2 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        {/* glow */}
        <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-brown-600/30 blur-3xl pointer-events-none" />

        <div className="relative z-10 text-center max-w-sm">
          <div className="mb-8">
            <RentXLogo size="lg" onDark />
          </div>
          <h2 className="text-3xl font-800 text-white leading-tight tracking-tight mb-4">
            Rent anything.<br />
            <span style={{ color: '#C47038' }}>From real people.</span>
          </h2>
          <p className="text-brown-300 text-sm leading-relaxed">
            Discover cameras, bikes, furniture and more from verified owners in your city. No subscription required.
          </p>

          {/* Testimonial / social proof */}
          <div className="mt-10 rounded-2xl bg-white/8 ring-1 ring-white/10 p-5 text-left">
            <p className="text-cream-200 text-sm leading-relaxed mb-3">
              "Found a DSLR camera for my wedding shoot in under 10 minutes. Saved so much money!"
            </p>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-brown-600 flex items-center justify-center text-white text-xs font-700">R</div>
              <div>
                <p className="text-white text-xs font-600">Rahul M.</p>
                <p className="text-brown-400 text-[11px]">Verified renter</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel – form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <RentXLogo size="lg" />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-800 text-brown-900 tracking-tight">Welcome back</h1>
            <p className="text-brown-400 text-sm mt-1.5">Sign in to rent and connect with owners</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-600 text-brown-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                className="input-field"
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-600 text-brown-700">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-600 text-brown-400 hover:text-brown-700 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="input-field pr-11"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brown-400 hover:text-brown-600 transition-colors"
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} size="lg" className="w-full mt-1">
              Sign In <ArrowRight size={16} />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-brown-400">
            New to RentX?{' '}
            <Link to="/register" className="font-700 text-brown-700 hover:text-brown-900 transition-colors">
              Create a free account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
