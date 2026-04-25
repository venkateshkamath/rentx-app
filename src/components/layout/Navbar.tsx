import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle, Plus, User, LogOut, ChevronDown, Menu, X, Leaf, Sun, type LucideIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import RentXLogo from '../ui/RentXLogo';
import UserAvatar from '../ui/UserAvatar';
import { getSocket } from '../../lib/socket';

interface Toast {
  id: string;
  title: string;
  message: string;
  chatId: string;
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestChatId, setLatestChatId] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = (id: string) => setToasts(t => t.filter(x => x.id !== id));

  useEffect(() => {
    if (!isAuthenticated || !user) {
      queueMicrotask(() => {
        setUnreadCount(0);
        setLatestChatId('');
      });
      return;
    }

    const socket = getSocket();

    const register = () => socket.emit('register-user', { userId: user.id });
    register();

    const handleNotification = (data: { chatId: string; message: { sender?: { _id?: string; username?: string }; content?: string; isRequest?: boolean } }) => {
      const senderId = data.message?.sender?._id;
      // Ignore if it's our own message (unless it's a system request msg which might lack _id)
      if (senderId && String(senderId) === String(user.id)) return;

      // Update count & link
      setLatestChatId(String(data.chatId));
      if (!location.pathname.includes('/chat')) {
        setUnreadCount(prev => prev + 1);
      }

      // Show toast
      const newToast: Toast = {
        id: Math.random().toString(36).slice(2),
        title: data.message.isRequest ? 'New Request' : (data.message.sender?.username ?? 'New Message'),
        message: data.message.content ?? 'Sent an image or attachment',
        chatId: data.chatId,
      };

      setToasts(prev => [...prev, newToast]);
      setTimeout(() => removeToast(newToast.id), 5000);
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
    setUnreadCount(0);
    setLatestChatId('');
    setProfileOpen(false);
    navigate('/');
  };

  const openChat = () => {
    setUnreadCount(0);
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
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white transform translate-x-1/4 -translate-y-1/4 shadow-sm">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
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
                              setUnreadCount(0);
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

      {/* ── Toasts Container ── */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 w-80 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-white border border-cream-200 shadow-card-hover rounded-xl p-3 px-4 flex items-start gap-3 animate-slide-in cursor-pointer hover:bg-cream-50 transition-colors"
            onClick={() => {
              removeToast(toast.id);
              setUnreadCount(0);
              navigate(`/chat?chat=${toast.chatId}`);
            }}
          >
            <div className="w-8 h-8 rounded-full bg-cream-200 shrink-0 flex items-center justify-center">
              <MessageCircle size={16} className="text-brown-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-brown-900 truncate">{toast.title}</p>
              <p className="text-xs text-brown-600 line-clamp-2 mt-0.5">{toast.message}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
              className="text-brown-400 hover:text-brown-600 p-1"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </nav>
  );
}
