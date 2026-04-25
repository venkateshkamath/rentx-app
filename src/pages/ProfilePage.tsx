import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Star, Package, X,
  Plus, Camera, Edit2,
  Award, Calendar, ShoppingBag, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { mockReviews } from '../data/mockReviews';
import ProductCard from '../components/products/ProductCard';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import { api } from '../lib/api';
import { mapApiProduct } from '../lib/mapProduct';
import type { Product } from '../types';
import UserAvatar from '../components/ui/UserAvatar';

/* ─── Types ─── */
type MainTab  = 'listings' | 'rented' | 'reviews';
type RentedSubTab = 'renting' | 'rented-out';

interface RentedProduct {
  _id: string;
  productId: string;
  productName: string;
  images: { url: string }[];
  rentPrice: number;
  location: string | { name?: string };
  rentalStartDate: string;
  rentalEndDate: string;
  userId: { _id: string; username: string; name: string };
}

interface OwnedProduct extends Product {
  status: string;
  rentedUserId?: {
    _id: string;
    username: string;
    name: string;
    location?: string;
  } | null;
  rentalStartDate?: string;
  rentalEndDate?: string;
}

/* ─── Helpers ─── */
function locStr(loc: string | { name?: string } | undefined): string {
  if (!loc) return '—';
  if (typeof loc === 'string') return loc;
  return loc.name ?? '—';
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════ */
export default function ProfilePage() {
  const { user, isAuthenticated, updateUser } = useAuth();
  const navigate = useNavigate();
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const [mainTab,     setMainTab]     = useState<MainTab>('listings');
  const [rentedSub,   setRentedSub]   = useState<RentedSubTab>('renting');
  const [editOpen,    setEditOpen]    = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [profile,   setProfile]   = useState({ name: user?.name ?? '', location: user?.location ?? '' });
  const [editForm,  setEditForm]  = useState(profile);

  /* ── Data ── */
  const [myListings,     setMyListings]     = useState<OwnedProduct[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [myRentals,      setMyRentals]      = useState<RentedProduct[]>([]);
  const [rentalsLoading,  setRentalsLoading]  = useState(true);

  const received = mockReviews.slice(0, 4);

  useEffect(() => {
    // Listings (owned products — includes rented-out ones)
    api.products.getUserProducts()
      .then(res => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = ((res.data as any[]) ?? []).map((p: any) => ({
          ...mapApiProduct(p),          // gives id, title, images, price, etc.
          status:          p.status,
          rentedUserId:    p.rentedUserId ?? null,
          rentalStartDate: p.rentalStartDate ?? null,
          rentalEndDate:   p.rentalEndDate   ?? null,
        }));
        setMyListings(mapped as OwnedProduct[]);
      })
      .catch(() => setMyListings([]))
      .finally(() => setListingsLoading(false));

    // Rentals (items I'm renting from others)
    api.products.getMyRentals()
      .then(res => setMyRentals((res.data as RentedProduct[]) ?? []))
      .catch(() => setMyRentals([]))
      .finally(() => setRentalsLoading(false));
  }, []);

  /* ── Guard ── */
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-cream-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package size={28} className="text-brown-400" />
          </div>
          <h2 className="text-lg font-semibold text-brown-800 mb-2">Sign in to view your profile</h2>
          <p className="text-brown-400 text-sm mb-5">Manage your listings and rental activity</p>
          <Button onClick={() => navigate('/login')}>Sign In</Button>
        </div>
      </div>
    );
  }

  /* ── Derived ── */
  const availableListings = myListings.filter(p => p.status === 'available');
  const rentedOutListings = myListings.filter(p => p.status === 'rented');
  const totalRented       = myRentals.length + rentedOutListings.length;

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
    : '—';

  /* ── Handlers ── */
  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setProfile(editForm);
    updateUser({ name: editForm.name, location: editForm.location });
    setSaving(false);
    setEditOpen(false);
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setAvatarError('Please choose an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setAvatarError('Profile photo must be under 5 MB.'); return; }
    setAvatarError('');
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await api.auth.updateAvatar(formData);
      updateUser({ avatar: res.avatar });
    } catch (err) {
      setAvatarError((err as Error).message ?? 'Upload failed. Try again.');
    } finally {
      setAvatarUploading(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────────── */
  return (
    <div className="bg-cream-100 min-h-full">
      <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

      {/* ══ HERO ══ */}
      <div
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #190C02 0%, #3A1F0A 45%, #6E4522 85%, #8A5E38 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.75\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }}
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-12 pb-20 text-center">
          {/* Avatar */}
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 rounded-2xl overflow-hidden ring-4 ring-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <UserAvatar name={user.name} avatar={user.avatar} className="w-full h-full object-cover" textClassName="text-4xl font-bold" />
            </div>
            <button
              type="button"
              onClick={() => !avatarUploading && avatarFileRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-card hover:bg-cream-100 transition-colors disabled:opacity-60"
              title="Change avatar"
            >
              {avatarUploading
                ? <div className="w-4 h-4 border-2 border-brown-400 border-t-transparent rounded-full animate-spin" />
                : <Camera size={14} className="text-brown-600" />}
            </button>
          </div>

          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">{profile.name}</h1>
          <p className="text-brown-300 text-sm mb-3">@{user.username}</p>

          {profile.location && (
            <div className="inline-flex items-center gap-1.5 bg-white/10 text-cream-200 text-xs px-3 py-1.5 rounded-full mb-6">
              <MapPin size={11} /> {profile.location}
            </div>
          )}

          {avatarError && <p className="mb-4 text-xs font-medium text-red-200">{avatarError}</p>}

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => { setEditForm(profile); setEditOpen(true); }}
              className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all border border-white/20 backdrop-blur-sm"
            >
              <Edit2 size={14} /> Edit Profile
            </button>
            <button
              onClick={() => navigate('/list-product')}
              className="inline-flex items-center gap-2 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-all shadow-card"
              style={{ backgroundColor: '#C47038' }}
            >
              <Plus size={14} /> Post an Item
            </button>
          </div>
        </div>
      </div>

      {/* ══ STATS STRIP ══ */}
      <div className="bg-white border-b border-cream-300 shadow-soft">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex divide-x divide-cream-300">
            {[
              { label: 'Listings',     value: myListings.length,  Icon: Package  },
              { label: 'Rental activity', value: totalRented,     Icon: ShoppingBag },
              { label: 'Avg rating',   value: '4.8★',             Icon: Star     },
              { label: 'Member since', value: memberSince,        Icon: Calendar },
            ].map(({ label, value, Icon }) => (
              <div key={label} className="flex-1 py-5 flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5">
                  <Icon size={14} className="text-brown-400" />
                  <span className="text-xl font-bold text-brown-800">{value}</span>
                </div>
                <span className="text-xs text-brown-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ CONTENT ══ */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Main tabs ── */}
        <div className="flex border-b border-cream-300 mb-7">
          {([
            { key: 'listings' as MainTab, label: 'My Listings', count: myListings.length    },
            { key: 'rented'   as MainTab, label: 'Rented',      count: totalRented          },
            { key: 'reviews'  as MainTab, label: 'Reviews',     count: received.length      },
          ] as { key: MainTab; label: string; count: number }[]).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setMainTab(key)}
              className={`relative pb-3 px-1 mr-7 text-sm font-medium transition-colors ${
                mainTab === key ? 'text-brown-800' : 'text-brown-400 hover:text-brown-600'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  mainTab === key ? 'bg-brown-100 text-brown-700' : 'bg-cream-200 text-brown-400'
                }`}>
                  {count}
                </span>
              )}
              {mainTab === key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brown-700 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* ════════════════ MY LISTINGS TAB ════════════════ */}
        {mainTab === 'listings' && (
          listingsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white border border-cream-200 rounded-2xl h-64 animate-pulse" />
              ))}
            </div>
          ) : myListings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {myListings.map(p => (
                <div key={p.id} className="relative">
                  <ProductCard product={p} />
                  {p.status === 'rented' && (
                    <div className="absolute top-3 left-3 bg-brown-700 text-cream-100 text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                      Rented Out
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Package size={32} className="text-brown-300" />}
              title="No listings yet"
              desc="Start earning by sharing something you own"
              cta="Post your first item"
              onCta={() => navigate('/list-product')}
            />
          )
        )}

        {/* ════════════════ RENTED TAB ════════════════ */}
        {mainTab === 'rented' && (
          <div>
            {/* Sub-tab pills */}
            <div className="flex gap-2 mb-6">
              {([
                { key: 'renting'    as RentedSubTab, label: 'Renting',    count: myRentals.length       },
                { key: 'rented-out' as RentedSubTab, label: 'Rented Out', count: rentedOutListings.length },
              ] as { key: RentedSubTab; label: string; count: number }[]).map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setRentedSub(key)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                    rentedSub === key
                      ? 'bg-brown-700 text-cream-100 border-brown-700 shadow-sm'
                      : 'bg-white text-brown-500 border-cream-300 hover:border-brown-400 hover:text-brown-700'
                  }`}
                >
                  {label}
                  {count > 0 && (
                    <span className={`ml-1.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                      rentedSub === key ? 'bg-white/20 text-white' : 'bg-cream-200 text-brown-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Renting (items I rent from others) ── */}
            {rentedSub === 'renting' && (
              rentalsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="bg-white border border-cream-200 rounded-2xl h-36 animate-pulse" />
                  ))}
                </div>
              ) : myRentals.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {myRentals.map(rental => {
                    const thumb    = rental.images?.[0]?.url;
                    const isActive = new Date(rental.rentalEndDate) >= new Date();
                    return (
                      <div
                        key={rental._id}
                        onClick={() => navigate(`/products/${rental.productId}`)}
                        className="bg-white border border-cream-200 rounded-2xl p-4 flex gap-4 shadow-soft hover:shadow-card transition-shadow cursor-pointer group"
                      >
                        <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-cream-200">
                          {thumb
                            ? <img src={thumb} alt={rental.productName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            : <div className="w-full h-full flex items-center justify-center"><Package size={22} className="text-brown-300" /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-semibold text-brown-800 text-sm truncate leading-snug">{rental.productName}</p>
                            <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              isActive
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-cream-200 text-brown-500 border border-cream-300'
                            }`}>
                              {isActive ? 'Active' : 'Ended'}
                            </span>
                          </div>
                          <p className="text-xs text-brown-400 mb-2 flex items-center gap-1">
                            <MapPin size={10} /> {locStr(rental.location)}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-brown-500 bg-cream-100 rounded-lg px-2.5 py-1.5 w-fit mb-1.5">
                            <Calendar size={10} className="text-brown-400 shrink-0" />
                            {fmtDate(rental.rentalStartDate)} → {fmtDate(rental.rentalEndDate)}
                          </div>
                          <p className="text-xs text-brown-400">
                            Owner: <span className="text-brown-600 font-medium">{rental.userId?.name || rental.userId?.username}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={<ShoppingBag size={32} className="text-brown-300" />}
                  title="Not renting anything yet"
                  desc="Items you're renting from others will appear here once an owner confirms your request"
                  cta="Browse items"
                  onCta={() => navigate('/')}
                />
              )
            )}

            {/* ── Rented Out (my items currently rented to someone) ── */}
            {rentedSub === 'rented-out' && (
              listingsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="bg-white border border-cream-200 rounded-2xl h-40 animate-pulse" />
                  ))}
                </div>
              ) : rentedOutListings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {rentedOutListings.map(item => {
                    const thumb    = item.images?.[0];
                    const renter   = item.rentedUserId;
                    const isActive = item.rentalEndDate ? new Date(item.rentalEndDate) >= new Date() : true;
                    return (
                      <div
                        key={item.id}
                        onClick={() => navigate(`/products/${item.id}`)}
                        className="bg-white border border-cream-200 rounded-2xl p-4 shadow-soft hover:shadow-card transition-shadow cursor-pointer group"
                      >
                        <div className="flex gap-4 mb-3">
                          <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-cream-200">
                            {thumb
                              ? <img src={typeof thumb === 'string' ? thumb : (thumb as { url: string }).url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              : <div className="w-full h-full flex items-center justify-center"><Package size={22} className="text-brown-300" /></div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="font-semibold text-brown-800 text-sm truncate leading-snug">{item.title}</p>
                              <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                isActive
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-cream-200 text-brown-500 border border-cream-300'
                              }`}>
                                {isActive ? 'Active' : 'Ended'}
                              </span>
                            </div>
                            {item.rentalStartDate && item.rentalEndDate && (
                              <div className="flex items-center gap-1.5 text-[11px] text-brown-500 bg-cream-100 rounded-lg px-2.5 py-1.5 w-fit">
                                <Calendar size={10} className="text-brown-400 shrink-0" />
                                {fmtDate(item.rentalStartDate)} → {fmtDate(item.rentalEndDate)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Renter info card */}
                        {renter ? (
                          <div className="bg-cream-50 border border-cream-200 rounded-xl px-3 py-2.5 flex items-center gap-3">
                            <UserAvatar
                              name={renter.name || renter.username}
                              className="w-8 h-8 rounded-full shrink-0"
                              textClassName="text-xs font-bold"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-brown-700 truncate">
                                {renter.name || renter.username}
                              </p>
                              {renter.location && (
                                <p className="text-[11px] text-brown-400 flex items-center gap-1 mt-0.5 truncate">
                                  <MapPin size={9} /> {renter.location}
                                </p>
                              )}
                            </div>
                            <div className="ml-auto shrink-0">
                              <CheckCircle2 size={16} className="text-green-500" />
                            </div>
                          </div>
                        ) : (
                          <div className="bg-cream-50 border border-cream-200 rounded-xl px-3 py-2.5">
                            <p className="text-xs text-brown-400 italic">External renter (not on RentX)</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={<Award size={32} className="text-brown-300" />}
                  title="Nothing rented out yet"
                  desc="When you mark one of your listings as rented, it'll appear here with the renter's details"
                />
              )
            )}
          </div>
        )}

        {/* ════════════════ REVIEWS TAB ════════════════ */}
        {mainTab === 'reviews' && (
          received.length > 0 ? (
            <div className="space-y-4">
              {received.map(r => (
                <div key={r.id} className="bg-white border border-cream-300 rounded-2xl p-5 shadow-soft">
                  <div className="flex items-start gap-3">
                    <img src={r.authorAvatar} alt={r.authorName} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <span className="font-semibold text-brown-800 text-sm">{r.authorName}</span>
                          <span className="text-brown-400 text-xs ml-2">
                            {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(n => (
                              <Star key={n} size={12} className={n <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-brown-200'} />
                            ))}
                          </div>
                          <Badge type={r.transactionType} size="sm" />
                        </div>
                      </div>
                      <p className="font-semibold text-brown-800 text-sm mt-2 mb-1">{r.title}</p>
                      <p className="text-brown-500 text-sm leading-relaxed">{r.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Star size={32} className="text-brown-300" />}
              title="No reviews yet"
              desc="Reviews from renters will appear here"
            />
          )
        )}
      </div>

      {/* ══ EDIT PROFILE MODAL ══ */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Profile" maxWidth="max-w-lg">
        <div className="space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-cream-200">
            <div className="relative">
              <UserAvatar name={user.name} avatar={user.avatar} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-cream-300" textClassName="text-2xl font-bold" />
              <button
                type="button"
                onClick={() => !avatarUploading && avatarFileRef.current?.click()}
                disabled={avatarUploading}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-brown-700 text-cream-100 rounded-xl flex items-center justify-center hover:bg-brown-800 transition-colors disabled:opacity-60"
              >
                {avatarUploading
                  ? <div className="w-3.5 h-3.5 border-2 border-cream-300 border-t-transparent rounded-full animate-spin" />
                  : <Camera size={12} />}
              </button>
            </div>
            <div>
              <p className="text-sm font-semibold text-brown-800">Profile photo</p>
              <p className="text-xs text-brown-400 mt-0.5">JPG, PNG or GIF · max 5 MB</p>
              {avatarError && <p className="text-xs text-red-500 mt-0.5">{avatarError}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1.5">Display name</label>
            <input
              value={editForm.name}
              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              className="input-field"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1.5">Location</label>
            <div className="relative">
              <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brown-400" />
              <input
                value={editForm.location}
                onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
                className="input-field pl-9"
                placeholder="City, State"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} loading={saving} className="flex-1">Save Changes</Button>
            <Button variant="secondary" onClick={() => setEditOpen(false)} className="flex-1">Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ─── Empty state component ─── */
function EmptyState({
  icon, title, desc, cta, onCta,
}: {
  icon: React.ReactNode; title: string; desc: string; cta?: string; onCta?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-cream-200 rounded-2xl">
      <div className="w-16 h-16 bg-cream-200 rounded-2xl flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-brown-700 mb-1">{title}</h3>
      <p className="text-brown-400 text-sm mb-5 max-w-xs">{desc}</p>
      {cta && onCta && (
        <button
          onClick={onCta}
          className="inline-flex items-center gap-1.5 bg-brown-700 hover:bg-brown-800 text-cream-100 text-sm font-medium px-4 py-2 rounded-xl transition-all"
        >
          <Plus size={14} /> {cta}
        </button>
      )}
    </div>
  );
}
