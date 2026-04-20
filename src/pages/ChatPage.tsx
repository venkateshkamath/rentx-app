import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Package, Circle, ImagePlus, X, Loader2, MessageCircle, Bot } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../lib/socket';
import { api } from '../lib/api';
import UserAvatar from '../components/ui/UserAvatar';

/* ─── Types ─── */
interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  imageUrl?: string;
  imageName?: string;
  timestamp: string;
}

interface ActiveChat {
  chatId: string;
  productId: string;
  messages: ChatMessage[];
}

interface ChatSummary {
  chatId: string;
  productId: string;
  productName: string;
  productImage: string;
  otherUser: { id: string; username: string; avatar: string };
  lastMessage: { content: string; imageUrl?: string; timestamp: string } | null;
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

/** Move a chat to the top of the list (most recent activity first). */
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
  const productIdParam = searchParams.get('product');
  const chatIdParam    = searchParams.get('chat');
  const ownerIdParam   = searchParams.get('owner');
  const initialMessageParam = searchParams.get('message');
  const initialImageParam   = searchParams.get('image');

  /* ── Sidebar ── */
  const [chatList, setChatList]       = useState<ChatSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);

  /* ── Active chat ── */
  const [activeChatId, setActiveChatId] = useState<string | null>(chatIdParam);
  const [activeChat, setActiveChat]     = useState<ActiveChat | null>(null);

  /* ── Input / image ── */
  const [input, setInput]                   = useState('');
  const [pendingImage, setPendingImage]     = useState<{ url: string; name: string } | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError]         = useState('');

  /* ── Connection ── */
  const [connected, setConnected]         = useState(false);
  const [joinError, setJoinError]         = useState('');
  const [connectFailed, setConnectFailed] = useState(false);

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
  const activeChatIdRef   = useRef<string | null>(chatIdParam);
  const productIdParamRef = useRef<string | null>(productIdParam);
  const userRef           = useRef(user);
  /* Tracks the last chatId we actually sent a join event for — prevents re-joining
     the same room when the effect re-runs due to unrelated state changes. */
  const lastJoinedRef = useRef<string | null>(null);

  const ownerBlocked = !!(ownerIdParam && user && ownerIdParam === user.id);

  /* Keep refs in sync with latest values */
  useEffect(() => { activeChatIdRef.current   = activeChatId;   }, [activeChatId]);
  useEffect(() => { productIdParamRef.current = productIdParam; }, [productIdParam]);
  useEffect(() => { userRef.current           = user;           }, [user]);

  /* ── Load chat list (once on mount, then on demand) ── */
  const loadChatList = useCallback(() => {
    setListLoading(true);
    api.chat.getAll()
      .then(res => setChatList((res.data as ChatSummary[]) ?? []))
      .catch(() => {})
      .finally(() => setListLoading(false));
  }, []); // no deps — stable forever

  useEffect(() => { if (isAuthenticated) loadChatList(); }, [isAuthenticated, loadChatList]);

  /* ── Scroll to bottom ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages]);

  /* ══════════════════════════════════════════════════════════════
     EFFECT 1 — Socket listeners (runs once per auth session)
     Uses refs for any values it needs from state/props so that
     we never need to put them in the dep array.
  ══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const socket = getSocket();
    if (socket.connected) queueMicrotask(() => setConnected(true));

    /* Emit the correct join event, guarded by lastJoinedRef */
    const doJoin = () => {
      const uid    = userRef.current?.id ?? '';
      const chatId = activeChatIdRef.current;
      const prodId = productIdParamRef.current;

      if (chatId) {
        if (chatId === lastJoinedRef.current) return; // already joined this room
        socket.emit('join-chat-by-id', { chatId, userId: uid });
        lastJoinedRef.current = chatId;
      } else if (prodId) {
        socket.emit('join-chat', { productId: prodId, userId: uid });
      }
    };

    const onConnect = () => {
      setConnected(true);
      setConnectFailed(false);
      doJoin();
    };
    const onDisconnect   = () => setConnected(false);
    const onConnectError = () => setConnectFailed(true);

    const onChatHistory = (data: {
      chatId: string;
      productId?: string;
      messages: Array<{ sender: { _id: string }; content: string; imageUrl?: string; imageName?: string; timestamp: string }>;
    }) => {
      const uid = userRef.current?.id ?? '';
      const initialMessageKey = `${data.chatId}:${initialMessageParam ?? ''}:${initialImageParam ?? ''}`;

      /* Update joined ref so future effect runs don't re-join */
      lastJoinedRef.current = data.chatId;

      setActiveChatId(data.chatId);
      setActiveChat({
        chatId: data.chatId,
        productId: data.productId ?? productIdParamRef.current ?? '',
        messages: data.messages.map((m, i) => ({
          id: `${i}-${m.timestamp}`,
          senderId: m.sender._id,
          content: m.content,
          imageUrl: m.imageUrl,
          imageName: m.imageName,
          timestamp: m.timestamp,
        })),
      });

      /* Send initial message only once */
      if (
        initialMessageParam &&
        data.messages.length === 0 &&
        initialMessageSentRef.current !== initialMessageKey
      ) {
        initialMessageSentRef.current = initialMessageKey;
        socket.emit('send-message', {
          chatId: data.chatId,
          senderId: uid,
          content: initialMessageParam,
          imageUrl: initialImageParam ?? '',
          imageName: initialImageParam ? 'Requested item' : '',
        });
      }

      /* Refresh sidebar only if this chat isn't in the list yet */
      setChatList(prev => {
        if (!prev.some(c => c.chatId === data.chatId)) {
          // New chat — reload the list once (outside React's render cycle)
          setTimeout(loadChatList, 0);
        }
        return prev;
      });

      setTimeout(() => inputRef.current?.focus(), 100);
    };

    const onReceiveMessage = (data: {
      chatId: string;
      message: { sender: { _id: string }; content: string; imageUrl?: string; imageName?: string; timestamp: string };
    }) => {
      /* Append to open thread only — unread + sidebar come from chat-notification so they
         still work when this socket is not joined to that chat room (other pages / other chats). */
      setActiveChat(prev => {
        if (!prev || !sameChatId(prev.chatId, data.chatId)) return prev;
        return {
          ...prev,
          messages: [...prev.messages, {
            id: `${Date.now()}-${Math.random()}`,
            senderId: data.message.sender._id,
            content: data.message.content,
            imageUrl: data.message.imageUrl,
            imageName: data.message.imageName,
            timestamp: data.message.timestamp,
          }],
        };
      });
    };

    /**
     * Delivered to user:${userId} for every message — unlike receive-message, which only
     * reaches sockets in the chat room. Drives unread badges + sidebar preview for all chats.
     */
    const onChatNotification = (data: {
      chatId: string;
      message: { sender: { _id: string }; content: string; imageUrl?: string; imageName?: string; timestamp: string };
    }) => {
      const uid = userRef.current?.id ?? '';
      const senderId = data.message?.sender?._id;
      const fromOther = String(senderId ?? '') !== String(uid ?? '');
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

    const onChatError = (err: { message: string }) => setJoinError(err.message);

    socket.on('connect',        onConnect);
    socket.on('disconnect',     onDisconnect);
    socket.on('connect_error',  onConnectError);
    socket.on('chat-history',   onChatHistory);
    socket.on('receive-message', onReceiveMessage);
    socket.on('chat-notification', onChatNotification);
    socket.on('chat-error',     onChatError);

    /* Initial join (if socket already connected when effect runs) */
    if (socket.connected) doJoin();

    return () => {
      socket.off('connect',        onConnect);
      socket.off('disconnect',     onDisconnect);
      socket.off('connect_error',  onConnectError);
      socket.off('chat-history',   onChatHistory);
      socket.off('receive-message', onReceiveMessage);
      socket.off('chat-notification', onChatNotification);
      socket.off('chat-error',     onChatError);
    };
  }, [isAuthenticated, user, loadChatList, initialMessageParam, initialImageParam]);
  // ↑ Note: activeChatId / productIdParam are intentionally NOT here —
  //   we read them via refs so the effect never restarts from those changes.

  /* ══════════════════════════════════════════════════════════════
     EFFECT 2 — Trigger join when user selects a chat from sidebar
     (activeChatId changes via selectChat, not via socket events)
  ══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!activeChatId || !user) return;
    if (activeChatId === lastJoinedRef.current) return; // already joined

    const socket = getSocket();
    if (!socket.connected) return; // onConnect in Effect 1 will handle it via refs

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
  const sendMessage = () => {
    if ((!input.trim() && !pendingImage) || !activeChat || !user) return;
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

  const selectChat = (chatId: string) => {
    if (activeChatId === chatId) { setMobileView('chat'); return; }
    setActiveChat(null);
    setJoinError('');
    setInput('');
    setPendingImage(null);
    setActiveChatId(chatId); // Effect 2 will emit join-chat-by-id
    setUnreadCounts(prev => {
      const next = { ...prev };
      delete next[String(chatId)];
      return next;
    });
    setMobileView('chat');
  };

  /* ═══════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="h-[calc(100vh-64px)] bg-cream-100 flex overflow-hidden">

      {/* ══ LEFT SIDEBAR ══ */}
      <aside className={`
        ${mobileView === 'chat' ? 'hidden' : 'flex'} md:flex
        w-full md:w-72 lg:w-80 shrink-0
        flex-col border-r border-cream-200 bg-white
      `}>
        {/* Sidebar header */}
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
                    {/* Avatar stack: product image + user initial */}
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
                        <p className={`text-sm font-semibold truncate ${isActive ? 'text-brown-900' : 'text-brown-800'}`}>
                          {chat.otherUser.username}
                        </p>
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
                          {lastText}
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
            </div>

            {/* Error banner */}
            {(ownerBlocked || joinError || connectFailed) && (
              <div className="bg-red-50 border-b border-red-200 px-4 py-3 text-sm text-red-600 text-center shrink-0">
                {ownerBlocked ? 'You cannot request your own rental.' : joinError || 'Cannot connect to chat server. Make sure the backend is running.'}
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
                {/* RentBot welcome message */}
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
                          👋 Hi! I've connected you for the rental enquiry about <span className="font-semibold">{productLabel}</span>. Feel free to ask the owner any questions about availability, pricing, or pickup.
                        </p>
                        <p className="text-xs text-brown-400 mt-1.5">Just now</p>
                      </div>
                    </div>
                  );
                })()}

                {activeChat.messages.length === 0 && (
                  <div className="flex justify-center py-4">
                    <p className="text-brown-400 text-xs bg-cream-200/70 rounded-full px-4 py-1.5">Be the first to send a message</p>
                  </div>
                )}

                {activeChat.messages.map(msg => {
                  const isMine = msg.senderId === user?.id;
                  const meta   = chatList.find(c => c.chatId === activeChat.chatId);
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      {/* Avatar for received messages */}
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
                        {msg.content && <p className="leading-relaxed">{msg.content}</p>}
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
            {(activeChat || (!ownerBlocked && !joinError && !connectFailed)) && (
              <div className={`px-4 py-3 bg-white border-t border-cream-200 shrink-0 ${!activeChat ? 'opacity-50 pointer-events-none' : ''}`}>
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
                <div className="flex items-center gap-2">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { handleImageUpload(e.target.files?.[0]); e.target.value = ''; }} />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={!activeChat || imageUploading}
                    className="w-10 h-10 rounded-xl border border-cream-300 bg-cream-100 text-brown-500 transition-colors hover:bg-cream-200 disabled:opacity-50 flex items-center justify-center"
                  >
                    {imageUploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder={pendingImage ? 'Add a caption or message…' : activeChat ? 'Type a message…' : 'Connecting…'}
                    className="flex-1 bg-cream-100 border border-cream-300 rounded-xl px-4 py-2.5 text-sm text-brown-800 placeholder-brown-300 focus:outline-none focus:ring-2 focus:ring-brown-300 focus:border-transparent"
                    autoComplete="off"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={(!input.trim() && !pendingImage) || !activeChat || imageUploading}
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
    </div>
  );
}
