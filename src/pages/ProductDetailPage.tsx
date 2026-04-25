import { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  MapPin,
  MessageCircle,
  Share2,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import ProductCard from '../components/products/ProductCard';
import ReviewSection from '../components/products/ReviewSection';
import UserAvatar from '../components/ui/UserAvatar';
import LocationAutocomplete from '../components/ui/LocationAutocomplete';
import RichTextEditor from '../components/ui/RichTextEditor';
import type { Category, Condition, LocationData, Product } from '../types';
import { api } from '../lib/api';
import { mapApiProduct } from '../lib/mapProduct';

const CATEGORIES: Category[] = ['Electronics', 'Furniture', 'Clothing', 'Books', 'Sports', 'Appliances', 'Vehicles', 'Tools', 'Art', 'Other'];
const CONDITIONS: Condition[] = ['Like New', 'Good', 'Fair', 'Used'];

interface EditForm {
  title: string;
  description: string;
  category: Category | '';
  condition: Condition | '';
  price: string;
  originalPrice: string;
  location: LocationData | null;
}

interface ChatParticipant {
  id: string;
  username: string;
  chatId: string;
}

interface RentForm {
  selectedUserId: string; // 'other' or a user id
  startDate: string;
  endDate: string;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [nameplateVisible, setNameplateVisible] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [loginModal, setLoginModal] = useState(false);
  const [rentDays, setRentDays] = useState(1);

  // Owner edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({ title: '', description: '', category: '', condition: '', price: '', originalPrice: '', location: null });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [related, setRelated] = useState<Product[]>([]);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareFailed, setShareFailed] = useState(false);

  // Rent-out modal state
  const [rentOutOpen, setRentOutOpen] = useState(false);
  const [chatParticipants, setChatParticipants] = useState<ChatParticipant[]>([]);
  const [rentForm, setRentForm] = useState<RentForm>({ selectedUserId: '', startDate: '', endDate: '' });
  const [rentError, setRentError] = useState('');
  const [rentLoading, setRentLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    queueMicrotask(() => {
      setLoading(true);
      setActiveImage(0);
    });
    api.products.getById(id)
      .then(res => {
        const mapped = mapApiProduct(res.data);
        setProduct(mapped);
        return api.products.getAll()
          .then(allRes => {
            const relatedProducts = (allRes.data as unknown[])
              .map(mapApiProduct)
              .filter(p => p.id !== mapped.id && p.category === mapped.category)
              .slice(0, 3);
            setRelated(relatedProducts);
          })
          .catch(() => setRelated([]));
      })
      .catch(() => {
        setProduct(null);
        setRelated([]);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const scrollEl = document.querySelector('main');
    const check = () => {
      if (!titleRef.current) return;
      setNameplateVisible(titleRef.current.getBoundingClientRect().bottom <= 64);
    };
    scrollEl?.addEventListener('scroll', check, { passive: true });
    return () => scrollEl?.removeEventListener('scroll', check);
  }, []);

  const isOwner = !!(user && product && user.id === product.ownerId);

  const prevImage = () => setActiveImage(i => (i === 0 ? (product?.images.length ?? 1) - 1 : i - 1));
  const nextImage = () => setActiveImage(i => (i === (product?.images.length ?? 1) - 1 ? 0 : i + 1));

  const handleStartRequest = () => {
    if (!isAuthenticated) { setLoginModal(true); return; }
    if (isOwner || !product || !user) return;

    const params = new URLSearchParams({
      product: product.mongoId ?? product.id,
      owner: product.ownerId,
      message: `RentX request: ${user.name} is requesting to rent "${product.title}" for ${rentDays} day${rentDays === 1 ? '' : 's'}. Estimated total: ₹${product.price * rentDays}.`,
    });
    const requestImage = product.images[activeImage]?.url ?? product.images[0]?.url;
    if (requestImage) params.set('image', requestImage);

    navigate(`/chat?${params.toString()}`);
  };

  const openEdit = () => {
    if (!product) return;
    setEditForm({
      title: product.title,
      description: product.description,
      category: product.category,
      condition: product.condition,
      price: String(product.price),
      originalPrice: String(product.originalPrice || ''),
      location: product.location,
    });
    setEditError('');
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!product || !editForm.title.trim() || !editForm.price) {
      setEditError('Title and price are required.');
      return;
    }
    setEditLoading(true);
    setEditError('');
    try {
      const res = await api.products.update(product.mongoId ?? product.id, {
        productName: editForm.title,
        description: editForm.description,
        productPrice: Number(editForm.price),
        productOriginalPrice: editForm.originalPrice ? Number(editForm.originalPrice) : undefined,
        category: editForm.category || undefined,
        condition: editForm.condition || undefined,
        location: editForm.location ? JSON.stringify(editForm.location) : undefined,
      }) as { data: unknown };
      setProduct(mapApiProduct(res.data));
      setEditOpen(false);
    } catch (err) {
      setEditError((err as Error).message ?? 'Failed to save. Try again.');
    } finally {
      setEditLoading(false);
    }
  };

  /* ── Open rent-out modal (available → rented) ── */
  const openRentOutModal = async () => {
    if (!product) return;
    setRentError('');
    setRentForm({ selectedUserId: '', startDate: '', endDate: '' });
    setRentOutOpen(true);

    try {
      const res = await api.products.getChatParticipants(product.mongoId ?? product.id) as { data: ChatParticipant[] };
      setChatParticipants(res.data ?? []);
    } catch {
      setChatParticipants([]);
    }
  };

  /* ── Submit rent-out form ── */
  const handleRentOut = async () => {
    if (!product) return;
    if (!rentForm.selectedUserId) { setRentError('Please select a renter.'); return; }
    if (!rentForm.startDate || !rentForm.endDate) { setRentError('Please select start and end dates.'); return; }
    if (new Date(rentForm.endDate) <= new Date(rentForm.startDate)) {
      setRentError('End date must be after start date.');
      return;
    }

    setRentLoading(true);
    setRentError('');
    try {
      const isOther = rentForm.selectedUserId === 'other';
      await api.products.updateStatus(product.mongoId ?? product.id, {
        status: 'rented',
        rentedUserId: isOther ? undefined : rentForm.selectedUserId,
        isExternalRenter: isOther,
        startDate: rentForm.startDate,
        endDate: rentForm.endDate,
      });
      setProduct(prev => prev ? { ...prev, available: false } : prev);
      setRentOutOpen(false);
    } catch (err) {
      setRentError((err as Error).message ?? 'Failed to update status.');
    } finally {
      setRentLoading(false);
    }
  };

  /* ── Mark available again (rented → available) ── */
  const handleMarkAvailable = async () => {
    if (!product) return;
    setStatusLoading(true);
    try {
      await api.products.updateStatus(product.mongoId ?? product.id, { status: 'available' });
      setProduct(prev => prev ? { ...prev, available: true } : prev);
    } catch {
      // silently fail
    } finally {
      setStatusLoading(false);
    }
  };

  const handleToggleStatus = () => {
    if (!product) return;
    if (product.available) {
      openRentOutModal();
    } else {
      handleMarkAvailable();
    }
  };

  const copyToClipboard = (text: string): boolean => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const handleShare = async () => {
    if (!product) return;
    const url = window.location.href;
    const payload = {
      title: product.title,
      text: `Check out "${product.title}" on RentX — ₹${product.price}/day`,
      url,
    };

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(payload);
        return;
      } catch (err) {
        const name = err instanceof DOMException ? err.name : (err as Error)?.name;
        if (name === 'AbortError') return;
      }
    }

    let copied = false;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch {
      copied = copyToClipboard(url);
    }

    if (copied) {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
      return;
    }

    setShareFailed(true);
    setTimeout(() => setShareFailed(false), 4000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brown-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-brown-400 text-sm">Loading product…</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-brown-400 mb-4">Product not found.</p>
          <Link to="/search" className="text-brown-600 font-medium hover:underline">← Back to listings</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-100 text-brown-900">

      <section className="border-b border-cream-300 bg-cream-50">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate('/search')}
            className="mb-6 flex items-center gap-2 text-sm font-800 text-brown-500 transition-colors hover:text-brown-900"
          >
            <ArrowLeft size={16} /> Back to listings
          </button>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <p className="text-xs font-800 uppercase tracking-[0.12em] text-accent">
                {product.category} · {product.condition}
              </p>
              <h1 ref={titleRef} className="mt-2 max-w-3xl text-3xl font-900 leading-tight md:text-5xl">{product.title}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-700 text-brown-500">
                <span className="flex items-center gap-1.5">
                  <MapPin size={15} className="text-brown-300" />
                  {product.location?.name || 'Location not set'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Star size={15} className="fill-brown-900 text-brown-900" />
                  {product.rating.toFixed(1)} · {product.reviewCount} review{product.reviewCount === 1 ? '' : 's'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar size={15} className="text-brown-300" />
                  Listed {new Date(product.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>

            <button
              onClick={handleShare}
              className="flex h-11 items-center justify-center gap-2 rounded-lg border border-cream-300 bg-white px-4 text-sm font-800 text-brown-700 shadow-soft transition-colors hover:border-brown-900 hover:text-brown-900 lg:justify-self-end"
            >
              <Share2 size={16} />
              Share listing
            </button>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-7">
            <div className="group relative overflow-hidden rounded-xl border border-cream-300 bg-cream-200 shadow-soft">
              <div className="aspect-[4/3]">
                {product.images[activeImage]?.url ? (
                  <img
                    key={activeImage}
                    src={product.images[activeImage]?.url}
                    alt={product.images[activeImage]?.caption ?? product.title}
                    className="h-full w-full object-cover transition-opacity duration-300"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-800 text-brown-300">RentX</div>
                )}
              </div>

              {product.images[activeImage]?.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-brown-900/70 to-transparent px-5 py-4">
                  <p className="text-sm font-700 text-cream-50">{product.images[activeImage].caption}</p>
                </div>
              )}

              {product.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-white/95 text-brown-700 opacity-0 shadow-soft transition-all hover:bg-white group-hover:opacity-100"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={19} />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-white/95 text-brown-700 opacity-0 shadow-soft transition-all hover:bg-white group-hover:opacity-100"
                    aria-label="Next image"
                  >
                    <ChevronRight size={19} />
                  </button>
                </>
              )}
            </div>

            {product.images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`aspect-[4/3] overflow-hidden rounded-lg border transition-all ${
                      i === activeImage ? 'border-brown-900 opacity-100' : 'border-cream-300 opacity-70 hover:opacity-100'
                    }`}
                    aria-label={`Show image ${i + 1}`}
                  >
                    <img src={img.url} alt={img.caption ?? `Image ${i + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <section className="border-t border-cream-300 pt-7">
              <h2 className="mb-3 text-sm font-900 uppercase tracking-[0.08em] text-brown-900">About this item</h2>
              {product.description
                ? <div
                    className="max-w-3xl max-h-72 overflow-y-auto pr-2 text-[15px] leading-7 text-brown-500 rich-content"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.description) }}
                  />
                : <p className="max-w-3xl text-[15px] leading-7 text-brown-500">No description provided.</p>
              }
            </section>

            <section className="grid gap-3 border-t border-cream-300 pt-7 sm:grid-cols-3">
              <div className="rounded-xl border border-cream-300 bg-cream-50 p-4">
                <p className="text-[11px] font-800 uppercase tracking-[0.08em] text-brown-300">Condition</p>
                <p className="mt-1 text-sm font-900 text-brown-900">{product.condition}</p>
              </div>
              <div className="rounded-xl border border-cream-300 bg-cream-50 p-4">
                <p className="text-[11px] font-800 uppercase tracking-[0.08em] text-brown-300">Category</p>
                <p className="mt-1 text-sm font-900 text-brown-900">{product.category}</p>
              </div>
              <div className="rounded-xl border border-cream-300 bg-cream-50 p-4">
                <p className="text-[11px] font-800 uppercase tracking-[0.08em] text-brown-300">Item value</p>
                <p className="mt-1 text-sm font-900 text-brown-900">
                  {product.originalPrice > 0 ? `₹${product.originalPrice.toLocaleString('en-IN')}` : 'Not provided'}
                </p>
              </div>
            </section>

            <ReviewSection
              productId={product.mongoId ?? product.id}
              isOwner={isOwner}
            />
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border border-cream-300 bg-cream-50 p-5 shadow-card">
              <div className={`overflow-hidden transition-all duration-300 ${nameplateVisible ? 'max-h-16 opacity-100 mb-4' : 'max-h-0 opacity-0 mb-0'}`}>
                <p className="text-xs font-800 uppercase tracking-[0.08em] text-brown-300 mb-0.5">Listing</p>
                <p className="truncate text-base font-900 text-brown-900 leading-tight">{product.title}</p>
              </div>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-800 uppercase tracking-[0.08em] text-brown-300">Daily rent</p>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-4xl font-900 tracking-tight text-brown-900">₹{product.price.toLocaleString('en-IN')}</span>
                    <span className="text-sm font-700 text-brown-400">/day</span>
                  </div>
                </div>
                <span className={`rounded-md px-2.5 py-1 text-[11px] font-900 uppercase tracking-[0.08em] ${
                  product.available ? 'bg-cream-200 text-brown-800' : 'bg-red-50 text-red-600'
                }`}>
                  {product.available ? 'Available' : 'Unavailable'}
                </span>
              </div>

              {isOwner ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] font-800 uppercase tracking-[0.08em] text-brown-300 mb-2">Listing status</p>
                    <div className="grid grid-cols-2 rounded-xl border border-cream-300 bg-cream-100 p-1 gap-1">
                      <button
                        onClick={() => !product.available && handleToggleStatus()}
                        disabled={statusLoading || product.available}
                        className={`relative py-2.5 rounded-lg text-xs font-900 transition-all duration-200 ${
                          product.available
                            ? 'bg-white text-brown-900 shadow-soft'
                            : 'text-brown-400 hover:text-brown-600'
                        }`}
                      >
                        {statusLoading && product.available && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="h-3.5 w-3.5 rounded-full border-2 border-brown-300 border-t-brown-700 animate-spin" />
                          </span>
                        )}
                        <span className={statusLoading && product.available ? 'opacity-0' : ''}>Available</span>
                      </button>
                      <button
                        onClick={() => product.available && handleToggleStatus()}
                        disabled={statusLoading || !product.available}
                        className={`relative py-2.5 rounded-lg text-xs font-900 transition-all duration-200 ${
                          !product.available
                            ? 'bg-white text-brown-900 shadow-soft'
                            : 'text-brown-400 hover:text-brown-600'
                        }`}
                      >
                        {statusLoading && !product.available && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="h-3.5 w-3.5 rounded-full border-2 border-brown-300 border-t-brown-700 animate-spin" />
                          </span>
                        )}
                        <span className={statusLoading && !product.available ? 'opacity-0' : ''}>Rented out</span>
                      </button>
                    </div>
                  </div>

                  <Button onClick={openEdit} variant="secondary" className="w-full rounded-xl">
                    <Edit2 size={15} /> Edit listing
                  </Button>

                  {/* <p className="text-center text-xs font-700 text-brown-400">You own this listing</p> */}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-cream-300 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-800 text-brown-700">Rental days</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setRentDays(d => Math.max(1, d - 1))}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-cream-300 bg-cream-50 text-sm font-900 text-brown-900 transition-colors hover:border-brown-900"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-sm font-900 text-brown-900">{rentDays}</span>
                        <button
                          onClick={() => setRentDays(d => d + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-cream-300 bg-cream-50 text-sm font-900 text-brown-900 transition-colors hover:border-brown-900"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-cream-300 pt-3 text-sm">
                      <span className="font-700 text-brown-500">Estimated total</span>
                      <span className="text-lg font-900 text-brown-900">₹{(product.price * rentDays).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <Button onClick={handleStartRequest} className="w-full rounded-lg" size="lg" disabled={!product.available}>
                    <MessageCircle size={18} />
                    {product.available ? 'Request rental' : 'Currently unavailable'}
                  </Button>

                  <div className="flex items-start gap-2 rounded-lg bg-cream-100 px-3 py-3">
                    <ShieldCheck size={15} className="mt-0.5 shrink-0 text-brown-400" />
                    <span className="text-xs font-700 leading-5 text-brown-400">
                      Sign in only when you are ready to message the owner.
                    </span>
                  </div>
                </div>
              )}

              <div className="my-5 border-t border-cream-300" />

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <UserAvatar name={product.ownerName} avatar={product.ownerAvatar} className="h-12 w-12 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-900 text-brown-900">
                      {product.ownerName}
                      {isOwner && <span className="ml-1 text-xs font-700 text-brown-400">(you)</span>}
                    </p>
                    <p className="mt-0.5 text-xs font-700 text-brown-400">Listed by owner</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-cream-300 bg-white p-3">
                    <div className="mb-1 flex items-center gap-1.5 text-brown-300">
                      <Clock size={14} />
                      <span className="text-[10px] font-800 uppercase tracking-[0.08em]">Status</span>
                    </div>
                    <p className="font-900 text-brown-900">{product.available ? 'Available now' : 'Unavailable'}</p>
                  </div>
                  <div className="rounded-lg border border-cream-300 bg-white p-3">
                    <div className="mb-1 flex items-center gap-1.5 text-brown-300">
                      <Star size={14} />
                      <span className="text-[10px] font-800 uppercase tracking-[0.08em]">Rating</span>
                    </div>
                    <p className="font-900 text-brown-900">{product.rating.toFixed(1)}</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mt-12 border-t border-cream-300 pt-8">
            <h2 className="mb-5 text-sm font-900 uppercase tracking-[0.08em] text-brown-900">You might also like</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}
      </main>

      {/* ── Share toast ── */}
      {shareCopied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-brown-800 text-cream-100 text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg pointer-events-none animate-fade-in">
          <Share2 size={14} />
          Link copied to clipboard!
        </div>
      )}
      {shareFailed && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[min(100vw-2rem,24rem)] text-center bg-brown-800 text-cream-100 text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg pointer-events-none animate-fade-in">
          Could not copy the link. Open this page over HTTPS or localhost, or copy the URL from the address bar.
        </div>
      )}

      {/* ── Login modal ── */}
      <Modal open={loginModal} onClose={() => setLoginModal(false)} title="Login required">
        <p className="text-brown-500 text-sm mb-5">
          You can browse RentX freely. Sign in when you want to request this item or message the owner.
        </p>
        <div className="flex gap-3">
          <Button onClick={() => navigate('/login')} className="flex-1">Sign In</Button>
          <Button variant="secondary" onClick={() => navigate('/register')} className="flex-1">Join Free</Button>
        </div>
      </Modal>

      {/* ── Edit listing modal ── */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Listing" maxWidth="max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1.5">Title</label>
            <input
              value={editForm.title}
              onChange={e => setEditForm(f => ({ ...f, title: e.target.value.slice(0, 80) }))}
              placeholder="Item title"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1.5">Description</label>
            <RichTextEditor
              value={editForm.description}
              onChange={val => setEditForm(f => ({ ...f, description: val }))}
              placeholder="Describe your item…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-brown-700 mb-1.5">Category</label>
              <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value as Category }))} className="input-field">
                <option value="">Select…</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-brown-700 mb-1.5">Condition</label>
              <select value={editForm.condition} onChange={e => setEditForm(f => ({ ...f, condition: e.target.value as Condition }))} className="input-field">
                <option value="">Select…</option>
                {CONDITIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-brown-700 mb-1.5">Rent per day (₹)</label>
              <input
                type="number"
                value={editForm.price}
                onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
                min={0}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brown-700 mb-1.5">Original Price (₹)</label>
              <input
                type="number"
                value={editForm.originalPrice}
                onChange={e => setEditForm(f => ({ ...f, originalPrice: e.target.value }))}
                min={0}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1.5">Location</label>
            <LocationAutocomplete
              value={editForm.location}
              onChange={loc => setEditForm(f => ({ ...f, location: loc }))}
              placeholder="Search city…"
              className="input-field"
            />
          </div>

          {editError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-600">{editError}</div>
          )}

          <div className="flex gap-3 pt-1">
            <Button onClick={handleEditSave} loading={editLoading} className="flex-1">Save Changes</Button>
            <Button variant="secondary" onClick={() => setEditOpen(false)} className="flex-1">Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* ── Rent-out modal ── */}
      <Modal open={rentOutOpen} onClose={() => setRentOutOpen(false)} title="Mark as Rented" maxWidth="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-brown-500">
            Record who rented this product and the rental period. Other chats will be notified and deleted in 24 hours.
          </p>

          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1.5">Rented to</label>
            <select
              value={rentForm.selectedUserId}
              onChange={e => setRentForm(f => ({ ...f, selectedUserId: e.target.value }))}
              className="input-field"
            >
              <option value="">Select a renter…</option>
              {chatParticipants.map(p => (
                <option key={p.id} value={p.id}>{p.username}</option>
              ))}
              <option value="other">Other (not on RentX)</option>
            </select>
            {chatParticipants.length === 0 && (
              <p className="text-xs text-brown-400 mt-1">No app users have chatted about this product yet.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-brown-700 mb-1.5">Start date</label>
              <input
                type="date"
                value={rentForm.startDate}
                onChange={e => setRentForm(f => ({ ...f, startDate: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brown-700 mb-1.5">End date</label>
              <input
                type="date"
                value={rentForm.endDate}
                onChange={e => setRentForm(f => ({ ...f, endDate: e.target.value }))}
                className="input-field"
              />
            </div>
          </div>

          {rentError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-600">{rentError}</div>
          )}

          <div className="flex gap-3 pt-1">
            <Button onClick={handleRentOut} loading={rentLoading} className="flex-1">Confirm Rental</Button>
            <Button variant="secondary" onClick={() => setRentOutOpen(false)} className="flex-1">Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
