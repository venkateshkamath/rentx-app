import { useLocation } from 'react-router-dom';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/layout/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ChatPage from './pages/ChatPage';
import ListProductPage from './pages/ListProductPage';
import ProfilePage from './pages/ProfilePage';

function NotFound() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center text-center px-4">
      <div>
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-semibold text-brown-800 mb-2">Page not found</h1>
        <p className="text-brown-400 text-sm mb-5">The page you're looking for doesn't exist.</p>
        <a href="/" className="btn-primary inline-flex items-center gap-2">Back to Home</a>
      </div>
    </div>
  );
}

/** Wraps the app shell so we can read the current route.
 *  Chat gets a fixed-height, non-scrolling container.
 *  Every other page scrolls normally through overflow-y-auto. */
function AppShell() {
  const { pathname } = useLocation();
  const isChatPage = pathname === '/chat';

  return (
    <div className="h-screen bg-cream-100 flex flex-col overflow-hidden">
      <Navbar />
      <main
        className={`flex-1 min-h-0 page-enter ${
          isChatPage
            ? 'flex flex-col overflow-hidden'   // chat: fixed height, internal scroll
            : 'overflow-y-auto'                  // all other pages: normal scroll
        }`}
      >
        <Routes>
          <Route path="/"             element={<HomePage />} />
          <Route path="/login"        element={<LoginPage />} />
          <Route path="/register"     element={<RegisterPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/chat"         element={<ChatPage />} />
          <Route path="/list-product" element={<ListProductPage />} />
          <Route path="/profile"      element={<ProfilePage />} />
          <Route path="*"             element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
