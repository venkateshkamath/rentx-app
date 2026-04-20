import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle, Plus, User, LogOut, ChevronDown, Menu, X, Leaf, Sun, type LucideIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import RentXLogo from '../ui/RentXLogo';
import UserAvatar from '../ui/UserAvatar';
import { getSocket } from '../../lib/socket';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const [latestChatId, setLatestChatId] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !user) {
      queueMicrotask(() => {
        setHasUnreadChat(false);
        setLatestChatId('');
      });
      return;
    }

    const socket = getSocket();

    const register = () => socket.emit('register-user', { userId: user.id });
    register();

    const handleNotification = (data: { chatId?: string; message?: { sender?: { _id?: string } } }) => {
      const senderId = data.message?.sender?._id;
      if (String(senderId ?? '') !== String(user.id ?? '')) {
        setLatestChatId(data.chatId != null ? String(data.chatId) : '');
        setHasUnreadChat(true);
      }
    };

    socket.on('connect', register);
    socket.on('chat-notification', handleNotification);
    return () => {
      socket.off('connect', register);
      socket.off('chat-notification', handleNotification);
    };
  }, [isAuthenticated, user, location.pathname]);

  const handleLogout = () => {
    logout();
    setHasUnreadChat(false);
    setLatestChatId('');
    setProfileOpen(false);
    navigate('/');
  };

  const openChat = () => {
    setHasUnreadChat(false);
    navigate(latestChatId ? `/chat?chat=${latestChatId}` : '/chat');
  };

  const navLinks: { to: string; label: string; icon: LucideIcon }[] = [
    // Explore route is temporarily hidden; the logo still routes home.
    // { to: '/', label: 'Explore', icon: LayoutGrid },
    // Rent route is temporarily hidden while Explore uses the rent header.
    // { to: '/?type=rent', label: 'Rent', icon: Tag },
  ];

  const isActive = (path: string) => location.pathname + location.search === path || (path === '/' && location.pathname === '/' && !location.search);

  return (
    <nav className="sticky top-0 z-40 border-b border-brown-100/60 bg-cream-50/95 shadow-soft backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex-shrink-0 transition-opacity hover:opacity-85">
            <RentXLogo size="md" />
          </Link>

          {/* Center nav links */}
          {navLinks.length > 0 && (
          <div className="hidden items-center gap-0.5 rounded-lg bg-cream-200/70 p-1 md:flex">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive(to)
                    ? 'bg-white text-brown-800 shadow-soft'
                    : 'text-brown-500 hover:text-brown-700'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
          )}

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Temporary theme preview toggle for checking the light green version. */}
            {/* <button
              onClick={toggleTheme}
              title={theme === 'warm' ? 'Preview light green theme' : 'Return to warm theme'}
              className="hidden items-center gap-1.5 rounded-lg border border-brown-100 bg-white px-3 py-2 text-xs font-semibold text-brown-600 shadow-soft transition hover:bg-cream-200 sm:flex"
            >
              {theme === 'warm' ? <Leaf size={14} /> : <Sun size={14} />}
              {theme === 'warm' ? 'Green' : 'Warm'}
            </button> */}

            {isAuthenticated ? (
              <>
                <button
                  onClick={() => navigate('/list-product')}
                  className="hidden items-center gap-1.5 rounded-lg bg-brown-700 px-4 py-2 text-sm font-semibold text-cream-100 shadow-soft transition-all hover:bg-brown-800 hover:shadow-card active:scale-95 sm:flex"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  Post Item
                </button>

                <button
                  type="button"
                  onClick={openChat}
                  className="relative rounded-lg p-2 text-brown-400 transition-colors hover:bg-cream-200 hover:text-brown-700"
                >
                  <MessageCircle size={20} />
                  {hasUnreadChat && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full ring-1 ring-white" />
                  )}
                </button>

                {/* Profile dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(p => !p)}
                    className="flex items-center gap-1.5 rounded-lg py-1 pl-1 pr-2.5 transition-colors hover:bg-cream-200"
                  >
                    <UserAvatar
                      name={user?.name ?? ''}
                      avatar={user?.avatar}
                      className="w-8 h-8 rounded-lg object-cover ring-1 ring-brown-200"
                    />
                    <ChevronDown
                      size={13}
                      className={`text-brown-400 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-lg border border-cream-200 bg-white py-2 shadow-card-hover">
                      {/* User info */}
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-cream-200 mb-1">
                        <UserAvatar name={user?.name ?? ''} avatar={user?.avatar} className="w-9 h-9 rounded-lg object-cover" />
                        <div>
                          <p className="font-semibold text-brown-900 text-sm leading-tight">{user?.name}</p>
                          <p className="text-brown-400 text-xs">@{user?.username}</p>
                        </div>
                      </div>

                      {[
                        { label: 'My Profile', icon: User, path: '/profile' },
                        { label: 'Post an Item', icon: Plus, path: '/list-product' },
                        { label: 'Messages', icon: MessageCircle, path: '/chat' },
                      ].map(({ label, icon: Icon, path }) => (
                        <button
                          key={path}
                          onClick={() => {
                            if (path === '/chat') {
                              setHasUnreadChat(false);
                              navigate(latestChatId ? `/chat?chat=${latestChatId}` : path);
                            } else {
                              navigate(path);
                            }
                            setProfileOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-brown-600 hover:bg-cream-100 hover:text-brown-900 transition-colors"
                        >
                          <Icon size={15} className="text-brown-400" />
                          {label}
                        </button>
                      ))}

                      <div className="border-t border-cream-200 mt-1 pt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <LogOut size={15} />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-brown-600 transition-colors hover:bg-cream-200 hover:text-brown-900 sm:inline-flex"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="hidden rounded-lg bg-brown-700 px-4 py-2 text-sm font-semibold text-cream-100 shadow-soft transition-all hover:bg-brown-800 hover:shadow-card active:scale-95 sm:inline-flex"
                >
                  Join Free
                </Link>
              </>
            )}

            <button
              onClick={() => setMenuOpen(m => !m)}
              className="rounded-lg p-2 text-brown-500 transition-colors hover:bg-cream-200 md:hidden"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <div className="md:hidden border-t border-brown-100 bg-cream-100 px-4 py-3 space-y-1">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-brown-600 transition-colors hover:bg-cream-200"
            >
              <Icon size={15} className="text-brown-400" />
              {label}
            </Link>
          ))}
          <button
            onClick={() => {
              toggleTheme();
              setMenuOpen(false);
            }}
            className="flex items-center gap-2.5 rounded-lg border border-brown-100 bg-white px-3 py-2.5 text-sm font-semibold text-brown-600 transition-colors hover:bg-cream-200"
          >
            {theme === 'warm' ? <Leaf size={15} className="text-brown-400" /> : <Sun size={15} className="text-brown-400" />}
            {theme === 'warm' ? 'Green preview' : 'Warm preview'}
          </button>
          {!isAuthenticated && (
            <>
              <div className="my-1 border-t border-cream-200" />
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-brown-600 transition-colors hover:bg-cream-200"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-lg bg-brown-700 px-3 py-2.5 text-sm font-semibold text-cream-100 transition-colors hover:bg-brown-800"
              >
                Join Free
              </Link>
            </>
          )}
          {isAuthenticated && (
            <>
              <div className="border-t border-cream-200 my-1" />
              <Link
                to="/list-product"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-lg bg-brown-50 px-3 py-2.5 text-sm font-semibold text-brown-700 transition-colors hover:bg-brown-100"
              >
                <Plus size={15} /> Post an Item
              </Link>
              <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-brown-600 transition-colors hover:bg-cream-200"
              >
                <User size={15} className="text-brown-400" /> My Profile
              </Link>
            </>
          )}
        </div>
      )}

      {profileOpen && (
        <div className="fixed inset-0 z-[-1]" onClick={() => setProfileOpen(false)} />
      )}
    </nav>
  );
}
