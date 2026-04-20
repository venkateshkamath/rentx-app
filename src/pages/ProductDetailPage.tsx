import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  Heart,
  MapPin,
  MessageCircle,
  Share2,
  ShieldCheck,
  Star,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/ui/Badge';
import StarRating from '../components/ui/StarRating';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import ProductCard from '../components/products/ProductCard';
import ReviewSection from '../components/products/ReviewSection';
import UserAvatar from '../components/ui/UserAvatar';
import type { Category, Condition, Product } from '../types';
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
  location: string;
  tags: string;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [wishlist, setWishlist] = useState(false);
  const [loginModal, setLoginModal] = useState(false);
  const [rentDays, setRentDays] = useState(1);

  // Owner edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({ title: '', description: '', category: '', condition: '', price: '', location: '', tags: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [related, setRelated] = useState<Product[]>([]);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareFailed, setShareFailed] = useState(false);

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
      location: product.location,
      tags: product.tags.join(', '),
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
        category: editForm.category || undefined,
        condition: editForm.condition || undefined,
        location: editForm.location,
        tags: editForm.tags,
      }) as { data: unknown };
      setProduct(mapApiProduct(res.data));
      setEditOpen(false);
    } catch (err) {
      setEditError((err as Error).message ?? 'Failed to save. Try again.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!product) return;
    const newStatus = product.available ? 'rented' : 'available';
    setStatusLoading(true);
    try {
      const res = await api.products.update(product.mongoId ?? product.id, { status: newStatus }) as { data: unknown };
      setProduct(mapApiProduct(res.data));
    } catch {
      // silently fail — status indicator stays as-is
    } finally {
      setStatusLoading(false);
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

    // Prefer Web Share API when the browser supports it (mobile + desktop Safari / Chrome, etc.).
    // Do NOT gate on maxTouchPoints — that is 0 on most desktops, which incorrectly disabled share.
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
          <Link to="/" className="text-brown-600 font-medium hover:underline">← Back to listings</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-brown-500 hover:text-brown-800 text-sm mb-6 transition-colors">
          <ArrowLeft size={16} /> Back to listings
        </button>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">

          {/* Left: Images */}
          <div className="lg:col-span-3 space-y-3">
            <div className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-cream-200 shadow-card">
              <img
                key={activeImage}
                src={product.images[activeImage]?.url}
                alt={product.images[activeImage]?.caption ?? product.title}
                className="w-full h-full object-cover transition-opacity duration-300"
              />
              {product.images[activeImage]?.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-brown-900/70 to-transparent px-5 py-4">
                  <p className="text-cream-100 text-sm font-medium">{product.images[activeImage].caption}</p>
                </div>
              )}
              {product.images.length > 1 && (
                <>
                  <button onClick={prevImage} className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-card transition-all hover:bg-white group-hover:opacity-100">
                    <ChevronLeft size={18} className="text-brown-700" />
                  </button>
                  <button onClick={nextImage} className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-card transition-all hover:bg-white group-hover:opacity-100">
                    <ChevronRight size={18} className="text-brown-700" />
                  </button>
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                    {product.images.map((_, i) => (
                      <button key={i} onClick={() => setActiveImage(i)} className={`rounded-full transition-all ${i === activeImage ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/60'}`} />
                    ))}
                  </div>
                </>
              )}
              <div className="absolute top-3 right-3 flex gap-2">
                {/* {!isOwner && (
                  <button
                    onClick={() => setWishlist(w => !w)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center shadow-card transition-all ${wishlist ? 'bg-red-500 text-white' : 'bg-white/90 text-brown-500 hover:text-red-500'}`}
                  >
                    <Heart size={16} className={wishlist ? 'fill-current' : ''} />
                  </button>
                )} */}
                <button
                  onClick={handleShare}
                  className="w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-card text-brown-500 hover:text-brown-700 transition-all"
                  aria-label="Share listing"
                >
                  <Share2 size={16} />
                </button>
              </div>
            </div>

            {product.images.length > 1 && (
              <div className="flex gap-2.5">
                {product.images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImage(i)} className={`h-16 w-20 overflow-hidden rounded-lg border-2 transition-all ${i === activeImage ? 'border-brown-500 shadow-soft' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                    <img src={img.url} alt={img.caption ?? `Image ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="rounded-lg border border-cream-300 bg-white p-5 shadow-soft">
              <h2 className="font-semibold text-brown-800 mb-3">About this item</h2>
              <p className="text-brown-600 text-sm leading-relaxed">{product.description || 'No description provided.'}</p>
              {product.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {product.tags.map(tag => (
                    <span key={tag} className="bg-cream-200 text-brown-500 text-xs px-2.5 py-1 rounded-full">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Details + CTA */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-lg border border-cream-300 bg-white p-5 shadow-card">
              <div className="flex items-start justify-between gap-3 mb-3">
                <Badge type={product.type} size="md" />
                <span className="text-xs text-brown-400 bg-cream-100 px-2 py-0.5 rounded-full">{product.condition}</span>
              </div>

              <h1 className="text-xl font-semibold text-brown-900 leading-snug mb-3">{product.title}</h1>

              <div className="flex items-center gap-3 mb-4">
                <StarRating rating={product.rating} reviewCount={product.reviewCount} />
                <span className="text-brown-300">·</span>
                <div className="flex items-center gap-1 text-brown-400 text-xs">
                  <MapPin size={12} /> {product.location || 'Location not set'}
                </div>
              </div>

              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-bold text-brown-900">₹{product.price}</span>
                <span className="text-brown-400 text-sm">/day</span>
              </div>

              {/* ── OWNER panel ── */}
              {isOwner ? (
                <div className="space-y-3">
                  {/* Availability toggle */}
                  <div className="rounded-xl bg-cream-50 border border-cream-300 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-brown-700">Availability</p>
                        <p className={`text-xs mt-0.5 font-semibold ${product.available ? 'text-green-600' : 'text-red-500'}`}>
                          {product.available ? 'Available for rent' : 'Marked as unavailable'}
                        </p>
                      </div>
                      <button
                        onClick={handleToggleStatus}
                        disabled={statusLoading}
                        className="flex items-center gap-1.5 text-sm font-medium text-brown-700 hover:text-brown-900 transition-colors disabled:opacity-50"
                      >
                        {statusLoading ? (
                          <div className="w-5 h-5 border-2 border-brown-400 border-t-transparent rounded-full animate-spin" />
                        ) : product.available ? (
                          <ToggleRight size={28} className="text-green-500" />
                        ) : (
                          <ToggleLeft size={28} className="text-brown-300" />
                        )}
                        {product.available ? 'Mark Unavailable' : 'Mark Available'}
                      </button>
                    </div>
                  </div>

                  {/* Edit button */}
                  <Button onClick={openEdit} variant="secondary" className="w-full">
                    <Edit2 size={15} /> Edit Listing
                  </Button>

                  <p className="text-xs text-brown-400 text-center">You own this listing</p>
                </div>
              ) : (
                /* ── RENTER panel ── */
                <>
                  <div className="mt-3 rounded-lg bg-cream-100 p-3.5 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-brown-500 font-medium">How many days?</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setRentDays(d => Math.max(1, d - 1))} className="w-6 h-6 rounded-full bg-brown-200 text-brown-700 text-sm font-bold flex items-center justify-center hover:bg-brown-300">−</button>
                        <span className="w-6 text-center text-sm font-semibold text-brown-800">{rentDays}</span>
                        <button onClick={() => setRentDays(d => d + 1)} className="w-6 h-6 rounded-full bg-brown-200 text-brown-700 text-sm font-bold flex items-center justify-center hover:bg-brown-300">+</button>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-brown-500">Total estimate</span>
                      <span className="font-bold text-brown-800">₹{product.price * rentDays}</span>
                    </div>
                  </div>

                  <Button onClick={handleStartRequest} className="w-full" size="lg" disabled={!product.available}>
                    <MessageCircle size={18} />
                    {product.available ? 'Request Rental' : 'Currently Unavailable'}
                  </Button>

                  <div className="flex items-center justify-center gap-1.5 mt-3">
                    <ShieldCheck size={13} className="text-green-500" />
                    <span className="text-xs text-brown-400">Login required before owner chat</span>
                  </div>
                </>
              )}
            </div>

            <div className="rounded-lg border border-cream-300 bg-white p-4 shadow-soft">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={15} className="text-brown-400" />
                <span className="text-sm font-medium text-brown-700">Availability</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${product.available ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className={`text-sm font-medium ${product.available ? 'text-green-700' : 'text-red-600'}`}>
                  {product.available ? 'Available now' : 'Currently unavailable'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-brown-400 text-xs">
                <Calendar size={12} />
                <span>Listed on {new Date(product.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
            </div>

            <div className="rounded-lg border border-cream-300 bg-white p-4 shadow-soft">
              <h3 className="text-sm font-semibold text-brown-700 mb-3">Listed by</h3>
              <div className="flex items-center gap-3">
                <UserAvatar name={product.ownerName} avatar={product.ownerAvatar} className="w-12 h-12 rounded-full object-cover shadow-soft" />
                <div className="flex-1">
                  <p className="font-semibold text-brown-800 text-sm">
                    {product.ownerName}
                    {isOwner && <span className="ml-2 text-xs font-normal text-brown-400">(you)</span>}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star size={11} className="fill-amber-400 text-amber-400" />
                    <span className="text-xs text-brown-500">{product.rating} · {product.reviewCount} reviews</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ReviewSection
          productId={product.id}
          initialReviews={[]}
          isOwner={isOwner}
        />

        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-semibold text-brown-800 mb-5">You might also like</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {related.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>

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
            <textarea
              value={editForm.description}
              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Describe your item…"
              className="input-field resize-none"
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
              <label className="block text-sm font-medium text-brown-700 mb-1.5">Price per day (₹)</label>
              <input
                type="number"
                value={editForm.price}
                onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
                min={0}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brown-700 mb-1.5">Location</label>
              <input
                value={editForm.location}
                onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
                placeholder="City, State"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1.5">Tags <span className="font-normal text-brown-400">(comma-separated)</span></label>
            <input
              value={editForm.tags}
              onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="camera, sony, mirrorless"
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
    </div>
  );
}
