import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Send, ArrowLeft, Package, Circle, ImagePlus, X, Loader2,
  MessageCircle, Bot, Check, XCircle, Clock, AlertCircle, MapPin, Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../lib/socket';
import { api } from '../lib/api';
import UserAvatar from '../components/ui/UserAvatar';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

/* ─── Types ─── */
type ChatStatus = 'pending' | 'active' | 'rejected' | 'disabled' | null;

interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  isSystem?: boolean;
  imageUrl?: string;
  imageName?: string;
  timestamp: string;
}

interface ActiveChat {
  chatId: string;
  productId: string;
  messages: ChatMessage[];
  ownerId?: string;
}

interface ChatSummary {
  chatId: string;
  productId: string;
  productName: string;
  productImage: string;
  otherUser: { id: string; username: string; avatar: string };
  lastMessage: { content: string; imageUrl?: string; timestamp: string } | null;
  status: ChatStatus;
  disabledReason?: string;
  updatedAt: string;
}

/* ─── Helpers ─── */
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return fmtTime(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const sameChatId = (a: string | undefined | null, b: string | undefined | null) =>
  String(a ?? '') === String(b ?? '');

function bubbleChatToTop(
  prev: ChatSummary[],
  chatId: string,
  patch: Partial<Pick<ChatSummary, 'lastMessage' | 'updatedAt'>>,
): ChatSummary[] {
  const id = String(chatId);
  const idx = prev.findIndex(c => sameChatId(c.chatId, id));
  if (idx === -1) return prev;
  const chat = prev[idx];
  const updated = { ...chat, ...patch };
  return [updated, ...prev.slice(0, idx), ...prev.slice(idx + 1)];
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════ */
export default function ChatPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productIdParam      = searchParams.get('product');
  const chatIdParam         = searchParams.get('chat');
  const ownerIdParam        = searchParams.get('owner');
  const initialMessageParam = searchParams.get('message');
  const initialImageParam   = searchParams.get('image');

  /* ── Sidebar ── */
  const [chatList, setChatList]       = useState<ChatSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);

  /* ── Active chat ── */
  const [activeChatId, setActiveChatId]   = useState<string | null>(chatIdParam);
  const [activeChat, setActiveChat]       = useState<ActiveChat | null>(null);
  const [chatStatus, setChatStatus]       = useState<ChatStatus>(null);
  const [disabledReason, setDisabledReason] = useState('');

  /* ── Input / image ── */
  const [input, setInput]                   = useState('');
  const [pendingImage, setPendingImage]     = useState<{ url: string; name: string } | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError]         = useState('');

  /* ── Location sharing ── */
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError]     = useState('');

  /* ── Connection ── */
  const [connected, setConnected]         = useState(false);
  const [joinError, setJoinError]         = useState('');
  const [connectFailed, setConnectFailed] = useState(false);

  /* ── Accept/Reject/Delete loading ── */
  const [requestActionLoading, setRequestActionLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen]       = useState(false);
  const [deleteLoading, setDeleteLoading]               = useState(false);
  const [deleteError, setDeleteError]                   = useState('');

  /* ── Unread counts ── */
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  /* ── Mobile view ── */
  const [mobileView, setMobileView] = useState<'list' | 'chat'>(
    chatIdParam || productIdParam ? 'chat' : 'list'
  );

  const messagesEndRef        = useRef<HTMLDivElement>(null);
  const inputRef              = useRef<HTMLInputElement>(null);
  const fileRef               = useRef<HTMLInputElement>(null);
  const initialMessageSentRef = useRef<string | null>(null);

  /* Refs used inside socket effect to avoid stale closures */
  const activeChatIdRef      = useRef<string | null>(chatIdParam);
  const productIdParamRef    = useRef<string | null>(productIdParam);
  const userRef              = useRef(user);
  const lastJoinedRef        = useRef<string | null>(null);
  /* Prevents join-chat from firing twice (StrictMode double-mount / reconnect) */
  const lastJoinedProductRef = useRef<string | null>(null);

  const ownerBlocked = !!(ownerIdParam && user && ownerIdParam === user.id);

  /* Keep refs in sync with latest values */
  useEffect(() => { activeChatIdRef.current   = activeChatId;   }, [activeChatId]);
  useEffect(() => { productIdParamRef.current = productIdParam; }, [productIdParam]);
  useEffect(() => { userRef.current           = user;           }, [user]);

  /* ── Load chat list ── */
  const loadChatList = useCallback(() => {
    setListLoading(true);
    api.chat.getAll()
      .then(res => setChatList((res.data as ChatSummary[]) ?? []))
      .catch(() => {})
      .finally(() => setListLoading(false));
  }, []);

  useEffect(() => { if (isAuthenticated) loadChatList(); }, [isAuthenticated, loadChatList]);

  /* ── Scroll to bottom ── */
  const isFirstScroll = useRef(true);
  useEffect(() => {
    if (!activeChat?.messages) return;
    // Instant scroll on first load, smooth on new messages
    messagesEndRef.current?.scrollIntoView({
      behavior: isFirstScroll.current ? 'instant' : 'smooth',
    });
    isFirstScroll.current = false;
  }, [activeChat?.messages]);

  // Reset first-scroll flag when switching chats
  useEffect(() => {
    isFirstScroll.current = true;
  }, [activeChatId]);

  /* ══════════════════════════════════════════════════════════════
     EFFECT 1 — Socket listeners
  ══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const socket = getSocket();
    if (socket.connected) queueMicrotask(() => setConnected(true));

    const doJoin = () => {
      const uid    = userRef.current?.id ?? '';
      const chatId = activeChatIdRef.current;
      const prodId = productIdParamRef.current;

      if (chatId) {
        if (chatId === lastJoinedRef.current) return;
        socket.emit('join-chat-by-id', { chatId, userId: uid });
        lastJoinedRef.current = chatId;
      } else if (prodId) {
        if (prodId === lastJoinedProductRef.current) return;
        lastJoinedProductRef.current = prodId;
        socket.emit('join-chat', { productId: prodId, userId: uid });
      }
    };

    const onConnect      = () => { setConnected(true); setConnectFailed(false); doJoin(); };
    const onDisconnect   = () => setConnected(false);
    const onConnectError = () => setConnectFailed(true);

    const onChatHistory = (data: {
      chatId: string;
      productId?: string;
      participants?: Array<{ _id: string; username: string }>;
      messages: Array<{
        sender?: { _id: string };
        isSystem?: boolean;
        content: string;
        imageUrl?: string;
        imageName?: string;
        timestamp: string;
      }>;
      status: ChatStatus;
      disabledReason?: string;
      isNewChat?: boolean;
    }) => {
      const uid = userRef.current?.id ?? '';
      const initialMessageKey = `${data.chatId}:${initialMessageParam ?? ''}:${initialImageParam ?? ''}`;

      lastJoinedRef.current = data.chatId;

      // Figure out who the owner is from participants (owner = not current user, but we don't know
      // directly — we'll derive it from the product owner which is stored in productId).
      // For now store participants so we can find the other user.

      setActiveChatId(data.chatId);
      setChatStatus(data.status);
      setDisabledReason(data.disabledReason || '');

      setActiveChat({
        chatId: data.chatId,
        productId: data.productId ?? productIdParamRef.current ?? '',
        messages: data.messages.map((m, i) => ({
          id: `${i}-${m.timestamp}`,
          senderId: m.sender?._id ?? 'system',
          isSystem: m.isSystem,
          content: m.content,
          imageUrl: m.imageUrl,
          imageName: m.imageName,
          timestamp: m.timestamp,
        })),
      });

      /* Send initial message only once, only if chat is active or pending (owner can read) */
      if (
        initialMessageParam &&
        data.messages.length === 0 &&
        initialMessageSentRef.current !== initialMessageKey &&
        (data.status === 'pending' || data.status === 'active')
      ) {
        initialMessageSentRef.current = initialMessageKey;
        // Note: the backend will block sending if status is pending and user is not owner.
        // The initial message is intentionally NOT sent here — the user must wait for acceptance.
        // The request itself is already communicated via email to the owner.
      }

      setChatList(prev => {
        if (!prev.some(c => c.chatId === data.chatId)) {
          setTimeout(loadChatList, 0);
        }
        return prev;
      });

      setTimeout(() => inputRef.current?.focus(), 100);
    };

    const onReceiveMessage = (data: {
      chatId: string;
      message: {
        sender?: { _id: string };
        isSystem?: boolean;
        content: string;
        imageUrl?: string;
        imageName?: string;
        timestamp: string;
      };
    }) => {
      setActiveChat(prev => {
        if (!prev || !sameChatId(prev.chatId, data.chatId)) return prev;
        return {
          ...prev,
          messages: [...prev.messages, {
            id: `${Date.now()}-${Math.random()}`,
            senderId: data.message.sender?._id ?? 'system',
            isSystem: data.message.isSystem,
            content: data.message.content,
            imageUrl: data.message.imageUrl,
            imageName: data.message.imageName,
            timestamp: data.message.timestamp,
          }],
        };
      });
    };

    const onChatNotification = (data: {
      chatId: string;
      message: {
        sender?: { _id: string };
        isSystem?: boolean;
        content: string;
        imageUrl?: string;
        timestamp: string;
      };
    }) => {
      const uid = userRef.current?.id ?? '';
      const senderId = data.message?.sender?._id;
      const fromOther = data.message.isSystem || (String(senderId ?? '') !== String(uid ?? ''));
      const cid = String(data.chatId);

      if (fromOther && !sameChatId(cid, activeChatIdRef.current)) {
        setUnreadCounts(prev => ({ ...prev, [cid]: (prev[cid] ?? 0) + 1 }));
      }

      setChatList(prev => {
        const next = bubbleChatToTop(prev, cid, {
          lastMessage: {
            content: data.message.content,
            imageUrl: data.message.imageUrl,
            timestamp: data.message.timestamp,
          },
          updatedAt: data.message.timestamp,
        });
        if (next === prev && !prev.some(c => sameChatId(c.chatId, cid))) {
          setTimeout(loadChatList, 0);
        }
        return next;
      });
    };

    const onChatStatusUpdate = (data: {
      chatId: string;
      status: ChatStatus;
      disabledReason?: string;
    }) => {
      const cid = String(data.chatId);
      // Update active chat if it matches
      if (sameChatId(cid, activeChatIdRef.current)) {
        setChatStatus(data.status);
        setDisabledReason(data.disabledReason || '');
      }
      // Update sidebar
      setChatList(prev =>
        prev.map(c =>
          sameChatId(c.chatId, cid)
            ? { ...c, status: data.status, disabledReason: data.disabledReason || '' }
            : c
        )
      );
    };

    const onChatError = (err: { message: string }) => setJoinError(err.message);

    socket.on('connect',           onConnect);
    socket.on('disconnect',        onDisconnect);
    socket.on('connect_error',     onConnectError);
    socket.on('chat-history',      onChatHistory);
    socket.on('receive-message',   onReceiveMessage);
    socket.on('chat-notification', onChatNotification);
    socket.on('chat-status-update', onChatStatusUpdate);
    socket.on('chat-error',        onChatError);

    if (socket.connected) doJoin();

    return () => {
      socket.off('connect',           onConnect);
      socket.off('disconnect',        onDisconnect);
      socket.off('connect_error',     onConnectError);
      socket.off('chat-history',      onChatHistory);
      socket.off('receive-message',   onReceiveMessage);
      socket.off('chat-notification', onChatNotification);
      socket.off('chat-status-update', onChatStatusUpdate);
      socket.off('chat-error',        onChatError);
    };
  }, [isAuthenticated, user, loadChatList, initialMessageParam, initialImageParam]);

  /* ══════════════════════════════════════════════════════════════
     EFFECT 2 — Join when user selects a chat from sidebar
  ══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!activeChatId || !user) return;
    if (activeChatId === lastJoinedRef.current) return;

    const socket = getSocket();
    if (!socket.connected) return;

    socket.emit('join-chat-by-id', { chatId: activeChatId, userId: user.id });
    lastJoinedRef.current = activeChatId;
  }, [activeChatId, user]);

  /* ── Guard ── */
  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">💬</div>
          <h2 className="text-lg font-semibold text-brown-800 mb-2">Sign in to access chats</h2>
          <p className="text-brown-400 text-sm mb-5">You need an account to message renters.</p>
          <button onClick={() => navigate('/login')} className="btn-primary">Sign In</button>
        </div>
      </div>
    );
  }

  /* ── Actions ── */
  const handleDeleteChat = async () => {
    if (!activeChatId) return;
    setDeleteError('');
    setDeleteLoading(true);
    try {
      const res = await api.chat.delete(activeChatId);
      if (res.success) {
        setChatList(prev => prev.filter(c => c.chatId !== activeChatId));
        setActiveChatId(null);
        setActiveChat(null);
        setMobileView('list');
        setDeleteConfirmOpen(false);
      } else {
        setDeleteError(res.message || "Failed to delete chat.");
      }
    } catch (err) {
      setDeleteError((err as Error).message || "Failed to delete chat.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const sendMessage = () => {
    if ((!input.trim() && !pendingImage) || !activeChat || !user) return;
    if (chatStatus !== 'active') return;
    const text = input.trim();
    setInput('');
    setPendingImage(null);
    getSocket().emit('send-message', {
      chatId: activeChat.chatId,
      senderId: user.id,
      content: text,
      imageUrl: pendingImage?.url ?? '',
      imageName: pendingImage?.name ?? '',
    });
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleImageUpload = async (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    setImageError('');
    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.chat.uploadImage(formData);
      setPendingImage({ url: res.url, name: file.name });
      setTimeout(() => inputRef.current?.focus(), 0);
    } catch (err) {
      setImageError((err as Error).message ?? 'Image upload failed.');
    } finally {
      setImageUploading(false);
    }
  };

  const sendLocation = () => {
    if (!activeChat || !user || chatStatus !== 'active') return;
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    setLocationLoading(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationLoading(false);
        const { latitude, longitude } = pos.coords;
        const mapsUrl = `https://maps.google.com/maps?q=${latitude},${longitude}`;
        const locationText = `📍 My Location: ${mapsUrl}`;
        getSocket().emit('send-message', {
          chatId: activeChat.chatId,
          senderId: user.id,
          content: locationText,
          imageUrl: '',
          imageName: '',
        });
        setTimeout(() => inputRef.current?.focus(), 0);
      },
      (err) => {
        setLocationLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError('Location access denied. Please allow location in your browser settings.');
        } else {
          setLocationError('Could not get your location. Please try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const selectChat = (chatId: string) => {
    if (activeChatId === chatId) { setMobileView('chat'); return; }
    setActiveChat(null);
    setChatStatus(null);
    setDisabledReason('');
    setJoinError('');
    setInput('');
    setPendingImage(null);
    setActiveChatId(chatId);
    setUnreadCounts(prev => {
      const next = { ...prev };
      delete next[String(chatId)];
      return next;
    });
    setMobileView('chat');
  };

  const handleAccept = () => {
    if (!activeChatId || !user) return;
    setRequestActionLoading(true);
    getSocket().emit('accept-chat-request', { chatId: activeChatId, ownerId: user.id });
    setRequestActionLoading(false);
  };

  const handleReject = () => {
    if (!activeChatId || !user) return;
    setRequestActionLoading(true);
    getSocket().emit('reject-chat-request', { chatId: activeChatId, ownerId: user.id });
    setRequestActionLoading(false);
  };

  /* ── Determine if input should be disabled ── */
  const inputDisabled = !activeChat || chatStatus !== 'active' || ownerBlocked || !connected;

  /* ── Status banner content ── */
  const statusBanner = (() => {
    if (ownerBlocked) return { text: 'You cannot request your own rental.', color: 'red' };
    if (joinError) return { text: joinError, color: 'red' };
    if (connectFailed) return { text: 'Cannot connect to chat server. Make sure the backend is running.', color: 'red' };
    if (chatStatus === 'pending') {
      // Are we the requester or the owner?
      const isRequester = ownerIdParam ? user?.id !== ownerIdParam : false;
      if (isRequester) {
        return { text: 'Your chat request is pending. The owner will accept or reject it shortly.', color: 'amber' };
      }
      return null; // Owner sees Accept/Reject buttons instead
    }
    if (chatStatus === 'rejected') return { text: disabledReason || 'This chat request was declined.', color: 'red' };
    if (chatStatus === 'disabled') return { text: disabledReason || 'This chat has been closed.', color: 'orange' };
    return null;
  })();

  /* ── Should owner see accept/reject panel? ── */
  const showOwnerActions = (() => {
    if (chatStatus !== 'pending') return false;
    // If ownerIdParam is set, the current user is the requester (not the owner)
    if (ownerIdParam && user?.id !== ownerIdParam) return false;
    // No ownerIdParam = current user is likely the owner (came from email/sidebar)
    return true;
  })();

  /* ═══════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="flex-1 min-h-0 bg-cream-100 flex overflow-hidden">

      {/* ══ LEFT SIDEBAR ══ */}
      <aside className={`
        ${mobileView === 'chat' ? 'hidden' : 'flex'} md:flex
        w-full md:w-72 lg:w-80 shrink-0
        flex-col border-r border-cream-200 bg-white
      `}>
        <div className="px-5 pt-5 pb-4 border-b border-cream-200 shrink-0 bg-gradient-to-b from-cream-50 to-white">
          <div className="flex items-center justify-between mb-0.5">
            <h2 className="font-bold text-brown-800 text-lg tracking-tight">Messages</h2>
            {chatList.length > 0 && (
              <span className="text-xs font-medium text-brown-400 bg-cream-100 border border-cream-200 px-2 py-0.5 rounded-full">
                {chatList.length}
              </span>
            )}
          </div>
          <p className="text-xs text-brown-400">Your rental conversations</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {listLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-brown-400" />
            </div>
          ) : chatList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-cream-100 border border-cream-200 flex items-center justify-center mb-4">
                <MessageCircle size={24} className="text-brown-300" />
              </div>
              <p className="text-brown-600 text-sm font-semibold">No conversations yet</p>
              <p className="text-brown-400 text-xs mt-1.5 leading-relaxed">Request a rental on any product page to start chatting</p>
            </div>
          ) : (
            <div className="py-1">
              {chatList.map(chat => {
                const isActive  = chat.chatId === activeChatId;
                const unread    = unreadCounts[String(chat.chatId)] ?? 0;
                const lastText  = chat.lastMessage?.imageUrl && !chat.lastMessage?.content
                  ? '📷 Image'
                  : chat.lastMessage?.content || 'No messages yet';

                const statusDot = (() => {
                  if (chat.status === 'pending') return <Clock size={10} className="text-amber-500" />;
                  if (chat.status === 'disabled' || chat.status === 'rejected') return <AlertCircle size={10} className="text-red-400" />;
                  return null;
                })();

                return (
                  <button
                    key={chat.chatId}
                    onClick={() => selectChat(chat.chatId)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-l-[3px] ${
                      isActive
                        ? 'bg-cream-100 border-l-brown-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]'
                        : 'hover:bg-cream-50 border-l-transparent'
                    }`}
                  >
                    <div className="relative shrink-0">
                      {chat.productImage
                        ? <img src={chat.productImage} alt={chat.productName} className="w-12 h-12 rounded-2xl object-cover shadow-sm" />
                        : <div className="w-12 h-12 rounded-2xl bg-cream-200 flex items-center justify-center shadow-sm"><Package size={16} className="text-brown-400" /></div>
                      }
                      <UserAvatar
                        name={chat.otherUser.username}
                        avatar={chat.otherUser.avatar}
                        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white shadow-sm"
                        textClassName="text-[9px] font-bold"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${isActive ? 'text-brown-900' : 'text-brown-800'}`}>
                            {chat.otherUser.username}
                          </p>
                          {statusDot}
                        </div>
                        {chat.lastMessage && (
                          <span className={`text-[10px] shrink-0 ${isActive ? 'text-brown-500' : 'text-brown-400'}`}>
                            {fmtDate(chat.lastMessage.timestamp)}
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] font-medium truncate mb-0.5 ${isActive ? 'text-brown-600' : 'text-brown-500'}`}>
                        {chat.productName}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs truncate ${isActive ? 'text-brown-500' : 'text-brown-400'}`}>
                          {chat.status === 'pending' ? '⏳ Pending acceptance' :
                           chat.status === 'disabled' ? '🔒 Chat closed' :
                           chat.status === 'rejected' ? '✗ Request declined' :
                           lastText}
                        </p>
                        {unread > 0 && !isActive && (
                          <span className="shrink-0 min-w-[18px] h-[18px] bg-brown-600 text-cream-100 text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                            {unread > 9 ? '9+' : unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* ══ RIGHT PANEL ══ */}
      <div className={`
        ${mobileView === 'list' ? 'hidden' : 'flex'} md:flex
        flex-1 flex-col min-w-0 bg-white
      `}>

        {/* Empty state when no chat selected */}
        {!activeChatId && !productIdParam && (
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center">
              <MessageCircle size={40} className="text-brown-300 mx-auto mb-3" />
              <p className="text-brown-500 text-sm font-medium">Select a conversation</p>
              <p className="text-brown-400 text-xs mt-1">or request a rental to start a new one</p>
            </div>
          </div>
        )}

        {(activeChatId || productIdParam) && (
          <>
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-cream-200 bg-white flex items-center gap-3 shrink-0">
              <button
                onClick={() => setMobileView('list')}
                className="md:hidden p-1 rounded-lg hover:bg-cream-200 text-brown-500"
              >
                <ArrowLeft size={18} />
              </button>

              {(() => {
                const meta = chatList.find(c => c.chatId === activeChatId);
                return meta ? (
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <UserAvatar
                      name={meta.otherUser.username}
                      avatar={meta.otherUser.avatar}
                      className="w-8 h-8 rounded-full shrink-0"
                      textClassName="text-sm font-bold"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-brown-800 text-sm truncate">{meta.otherUser.username}</p>
                      <p className="text-xs text-brown-400 truncate">{meta.productName}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-brown-800 text-sm">Rental Enquiry</p>
                    <div className="flex items-center gap-1.5">
                      <Circle size={8} className={connected ? 'fill-green-400 text-green-400' : 'fill-brown-300 text-brown-300'} />
                      <p className={`text-xs ${connected ? 'text-green-600' : 'text-brown-400'}`}>
                        {connected ? 'Connected' : connectFailed ? 'Connection failed' : 'Connecting…'}
                      </p>
                    </div>
                  </div>
                );
              })()}

              <div className="hidden md:flex items-center gap-1.5 shrink-0">
                <Circle size={8} className={connected ? 'fill-green-400 text-green-400' : 'fill-brown-300 text-brown-300'} />
                <span className={`text-xs ${connected ? 'text-green-600' : 'text-brown-400'}`}>
                  {connected ? 'Online' : 'Offline'}
                </span>
              </div>

              {activeChat?.productId && (
                <button
                  onClick={() => navigate(`/products/${activeChat.productId}`)}
                  className="hidden sm:flex items-center gap-1.5 text-xs text-brown-500 hover:text-brown-700 bg-cream-100 border border-cream-300 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                >
                  <Package size={12} /> View Item
                </button>
              )}

              {activeChatId && (
                <button
                  onClick={() => { setDeleteError(''); setDeleteConfirmOpen(true); }}
                  className="flex items-center gap-1.5 p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors shrink-0"
                  title="Delete Chat"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {/* Status banner */}
            {statusBanner && (
              <div className={`px-4 py-3 text-sm text-center shrink-0 border-b ${
                statusBanner.color === 'red'    ? 'bg-red-50 border-red-200 text-red-600' :
                statusBanner.color === 'amber'  ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                                  'bg-orange-50 border-orange-200 text-orange-700'
              }`}>
                {statusBanner.text}
              </div>
            )}

            {/* Owner: Accept / Reject panel */}
            {showOwnerActions && activeChat && (
              <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 shrink-0">
                <p className="text-sm font-semibold text-amber-800 mb-2">
                  Someone wants to chat about this rental. Accept or decline?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleAccept}
                    disabled={requestActionLoading}
                    className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    <Check size={15} /> Accept
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={requestActionLoading}
                    className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    <XCircle size={15} /> Decline
                  </button>
                </div>
              </div>
            )}

            {/* Loading */}
            {!activeChat && !ownerBlocked && !joinError && !connectFailed && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-brown-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-brown-400 text-sm">Joining chat room…</p>
                </div>
              </div>
            )}

            {/* Connection failed */}
            {connectFailed && !joinError && (
              <div className="flex-1 flex items-center justify-center px-6 text-center">
                <div>
                  <div className="text-4xl mb-3">🔌</div>
                  <p className="text-brown-500 text-sm">Start the backend server and refresh to chat.</p>
                </div>
              </div>
            )}

            {/* Messages */}
            {activeChat && (
              <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3 bg-cream-100/60">
                {/* RentBot welcome */}
                {(() => {
                  const meta = chatList.find(c => c.chatId === activeChat.chatId);
                  const productLabel = meta?.productName ?? 'this item';
                  return (
                    <div className="flex items-start gap-2.5 mb-1">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brown-600 to-brown-800 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <Bot size={14} className="text-cream-100" />
                      </div>
                      <div className="bg-white border border-cream-300 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[72%] shadow-sm">
                        <p className="text-[11px] font-semibold text-brown-600 mb-1.5 flex items-center gap-1">
                          RentBot <span className="bg-brown-100 text-brown-500 text-[9px] px-1.5 py-0.5 rounded-full font-medium">BOT</span>
                        </p>
                        <p className="text-sm text-brown-800 leading-relaxed">
                          👋 A chat request has been created for <span className="font-semibold">{productLabel}</span>.
                          The owner has been notified by email. Messaging will be enabled once they accept.
                        </p>
                        <p className="text-xs text-brown-400 mt-1.5">Just now</p>
                      </div>
                    </div>
                  );
                })()}

                {activeChat.messages.length === 0 && chatStatus === 'active' && (
                  <div className="flex justify-center py-4">
                    <p className="text-brown-400 text-xs bg-cream-200/70 rounded-full px-4 py-1.5">Chat accepted — be the first to send a message</p>
                  </div>
                )}

                {activeChat.messages.map(msg => {
                  if (msg.isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center my-3">
                        <div className="bg-brown-50 border border-brown-200 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-sm max-w-[85%] text-center">
                          <Bot size={13} className="text-brown-500 shrink-0" />
                          <p className="text-[11px] font-medium text-brown-700 leading-snug break-words">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  const isMine = msg.senderId === user?.id;
                  const meta   = chatList.find(c => c.chatId === activeChat.chatId);
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      {!isMine && (
                        <UserAvatar
                          name={meta?.otherUser.username ?? '?'}
                          avatar={meta?.otherUser.avatar}
                          className="w-7 h-7 rounded-full shrink-0 mb-0.5"
                          textClassName="text-[10px] font-bold"
                        />
                      )}
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                        isMine
                          ? 'bg-brown-600 text-cream-100 rounded-br-sm'
                          : 'bg-white text-brown-800 rounded-bl-sm border border-cream-200'
                      }`}>
                        {msg.content && (() => {
                          // Render location messages with a clickable link
                          const locationMatch = msg.content.match(/^(📍 My Location: )(https:\/\/maps\.google\.com\/maps\?q=[\d.,]+)$/);
                          if (locationMatch) {
                            return (
                              <p className="leading-relaxed">
                                📍 My Location:{' '}
                                <a
                                  href={locationMatch[2]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`underline font-medium break-all ${isMine ? 'text-cream-200 hover:text-white' : 'text-brown-600 hover:text-brown-800'}`}
                                >
                                  Open in Maps
                                </a>
                              </p>
                            );
                          }
                          return <p className="leading-relaxed">{msg.content}</p>;
                        })()}
                        {msg.imageUrl && (
                          <img
                            src={msg.imageUrl}
                            alt={msg.imageName || 'Chat attachment'}
                            className={`max-h-56 w-full rounded-xl object-cover ${msg.content ? 'mt-2' : ''}`}
                          />
                        )}
                        <p className={`text-[10px] mt-1.5 ${isMine ? 'text-brown-300 text-right' : 'text-brown-400'}`}>
                          {fmtTime(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Input */}
            {activeChat && (
              <div className={`px-4 py-3 bg-white border-t border-cream-200 shrink-0 ${inputDisabled ? 'opacity-60' : ''}`}>
                {imageUploading && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg border border-cream-300 bg-cream-100 px-3 py-2.5 text-xs text-brown-500">
                    <Loader2 size={14} className="animate-spin" />
                    Uploading image…
                  </div>
                )}
                {imageError && !imageUploading && (
                  <div className="mb-3 flex items-center justify-between rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
                    {imageError}
                    <button onClick={() => setImageError('')}><X size={13} /></button>
                  </div>
                )}
                {locationError && (
                  <div className="mb-3 flex items-center justify-between rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
                    {locationError}
                    <button onClick={() => setLocationError('')}><X size={13} /></button>
                  </div>
                )}
                {pendingImage && !imageUploading && (
                  <div className="mb-3 rounded-xl border border-cream-300 bg-cream-100 p-2.5">
                    <div className="flex items-center gap-3">
                      <img src={pendingImage.url} alt={pendingImage.name} className="h-16 w-16 rounded-lg object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-brown-600 truncate">{pendingImage.name}</p>
                        <p className="text-xs text-brown-400 mt-0.5">Add a message below (optional)</p>
                      </div>
                      <button onClick={() => setPendingImage(null)} className="rounded-lg p-1 text-brown-400 hover:bg-cream-200 hover:text-brown-700 shrink-0">
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Disabled overlay message */}
                {inputDisabled && chatStatus !== null && chatStatus !== 'active' && (
                  <p className="text-xs text-brown-400 text-center mb-2">
                    {chatStatus === 'pending' ? 'Waiting for owner to accept…' :
                     chatStatus === 'rejected' ? 'Chat request was declined' :
                     'This chat has been closed'}
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { handleImageUpload(e.target.files?.[0]); e.target.value = ''; }} />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={inputDisabled || imageUploading}
                    title="Send image"
                    className="w-10 h-10 rounded-xl border border-cream-300 bg-cream-100 text-brown-500 transition-colors hover:bg-cream-200 disabled:opacity-50 flex items-center justify-center"
                  >
                    {imageUploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={sendLocation}
                    disabled={inputDisabled || locationLoading}
                    title="Share your location"
                    className="w-10 h-10 rounded-xl border border-cream-300 bg-cream-100 text-brown-500 transition-colors hover:bg-green-50 hover:border-green-300 hover:text-green-600 disabled:opacity-50 flex items-center justify-center"
                  >
                    {locationLoading ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder={
                      inputDisabled
                        ? (chatStatus === 'pending' ? 'Waiting for acceptance…' : 'Chat unavailable')
                        : (pendingImage ? 'Add a caption or message…' : 'Type a message…')
                    }
                    disabled={inputDisabled}
                    className="flex-1 bg-cream-100 border border-cream-300 rounded-xl px-4 py-2.5 text-sm text-brown-800 placeholder-brown-300 focus:outline-none focus:ring-2 focus:ring-brown-300 focus:border-transparent disabled:cursor-not-allowed"
                    autoComplete="off"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={(!input.trim() && !pendingImage) || inputDisabled || imageUploading}
                    className="w-10 h-10 bg-brown-600 hover:bg-brown-700 disabled:bg-cream-300 text-cream-100 disabled:text-brown-400 rounded-xl flex items-center justify-center transition-all active:scale-95"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══ DELETE CONFIRM MODAL ══ */}
      <Modal open={deleteConfirmOpen} onClose={() => !deleteLoading && setDeleteConfirmOpen(false)} title="Delete Chat" maxWidth="max-w-md">
        <div className="space-y-4">
          <p className="text-brown-700 text-sm">
            Are you sure you want to permanently delete this conversation? This action cannot be undone.
          </p>
          {deleteError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-600">
              {deleteError}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleDeleteChat}
              loading={deleteLoading}
              className="flex-1 bg-red-600 hover:bg-red-700 border-transparent text-white"
            >
              Delete
            </Button>
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleteLoading}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
