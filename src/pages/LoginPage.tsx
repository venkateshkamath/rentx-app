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
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-cream-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-card-hover border border-cream-200 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-brown-600 via-brown-400 to-accent" />

          <div className="p-8">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="mb-4">
                <RentXLogo size="lg" />
              </div>
              <h1 className="text-2xl font-semibold text-brown-900">Welcome back</h1>
              <p className="text-brown-400 text-sm mt-1">Sign in to rent and connect with owners</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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
              </div>

              <div>
                <label className="block text-sm font-medium text-brown-700 mb-1.5">Password</label>
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
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-600">
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
                Sign In <ArrowRight size={16} />
              </Button>
            </form>

            <div className="mt-5 text-center">
              <p className="text-brown-400 text-sm">
                New to RentX?{' '}
                <Link to="/register" className="text-brown-700 font-semibold hover:text-brown-900 transition-colors">
                  Create a free account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
