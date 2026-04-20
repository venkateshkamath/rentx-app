import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Star, Package, X,
  CheckCircle2, Plus, Camera, Edit2,
  Award, Calendar, CloudUpload
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

type Tab = 'listings' | 'reviews' | 'photos';

interface UploadedPhoto {
  id: string; url: string; name: string; caption: string; status: 'uploading' | 'done';
}

const SAMPLE_URLS = [
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500',
  'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=500',
  'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500',
  'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=500',
];

export default function ProfilePage() {
  const { user, isAuthenticated, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('listings');
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [profile, setProfile] = useState({
    name: user?.name ?? '',
    bio: 'Passionate about sharing — cameras, bikes, and good reads.',
    location: user?.location ?? '',
  });
  const [editForm, setEditForm] = useState(profile);

  const [myListings, setMyListings] = useState<Product[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const received = mockReviews.slice(0, 4);

  useEffect(() => {
    api.products.getUserProducts()
      .then(res => {
        const mapped = (res.data as unknown[]).map(mapApiProduct);
        setMyListings(mapped);
      })
      .catch(() => {
        setMyListings([]);
      })
      .finally(() => setListingsLoading(false));
  }, []);

  /* ─── guard ─── */
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-cream-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package size={28} className="text-brown-400" />
          </div>
          <h2 className="text-lg font-semibold text-brown-800 mb-2">Sign in to view your profile</h2>
          <p className="text-brown-400 text-sm mb-5">Manage listings, reviews and your media library</p>
          <Button onClick={() => navigate('/login')}>Sign In</Button>
        </div>
      </div>
    );
  }

  /* ─── save handler ─── */
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

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Profile photo must be under 5 MB.');
      return;
    }

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

  /* ─── photo upload helpers ─── */
  const enqueuePhoto = (name: string, url: string) => {
    const id = `ph-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setPhotos(p => [...p, { id, url, name, caption: '', status: 'uploading' }]);
    setTimeout(
      () => setPhotos(p => p.map(ph => ph.id === id ? { ...ph, status: 'done' } : ph)),
      900 + Math.random() * 700,
    );
  };

  const handleFiles = (files: File[]) =>
    files.slice(0, 10).forEach((f, i) => enqueuePhoto(f.name, SAMPLE_URLS[i % SAMPLE_URLS.length]));

  const addSample = () => enqueuePhoto(`photo_${photos.length + 1}.jpg`, SAMPLE_URLS[photos.length % SAMPLE_URLS.length]);

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
    : '—';

  const stats = [
    { label: 'Listings', value: myListings.length, icon: Package },
    { label: 'Avg rating', value: '4.8', icon: Star, suffix: '★' },
    { label: 'Reviews', value: 34, icon: Award },
    { label: 'Member since', value: memberSince, icon: Calendar },
  ];

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'listings', label: 'Listings',        count: myListings.length },
    { key: 'reviews',  label: 'Reviews',          count: received.length },
    { key: 'photos',   label: 'Media Library',    count: photos.filter(p => p.status === 'done').length },
  ];

  return (
    <div className="min-h-screen bg-cream-100">
      <input
        ref={avatarFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
      />

      {/* ════════════════════════════════════════
          HERO
          ════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #190C02 0%, #3A1F0A 45%, #6E4522 85%, #8A5E38 100%)' }}
      >
        {/* Subtle grain texture overlay */}
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

          {/* Name + username */}
          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">
            {profile.name}
          </h1>
          <p className="text-brown-300 text-sm mb-3">@{user.username}</p>

          {/* Location pill */}
          <div className="inline-flex items-center gap-1.5 bg-white/10 text-cream-200 text-xs px-3 py-1.5 rounded-full mb-6">
            <MapPin size={11} />
            {profile.location}
          </div>

          {/* Bio */}
          <p className="text-brown-200 text-sm max-w-md mx-auto leading-relaxed mb-6">
            {profile.bio}
          </p>
          {avatarError && (
            <p className="mb-4 text-xs font-medium text-red-200">{avatarError}</p>
          )}

          {/* CTA row */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => { setEditForm(profile); setEditOpen(true); }}
              className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all border border-white/20 backdrop-blur-sm"
            >
              <Edit2 size={14} /> Edit Profile
            </button>
            <button
              onClick={() => navigate('/list-product')}
              className="inline-flex items-center gap-2 bg-accent text-white text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-all shadow-card"
              style={{ backgroundColor: '#C47038' }}
            >
              <Plus size={14} /> Post an Item
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          STATS STRIP
          ════════════════════════════════════════ */}
      <div className="bg-white border-b border-cream-300 shadow-soft">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex divide-x divide-cream-300">
            {stats.map(({ label, value, icon: Icon, suffix }) => (
              <div key={label} className="flex-1 py-5 flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5">
                  <Icon size={14} className="text-brown-400" />
                  <span className="text-xl font-bold text-brown-800">
                    {value}{suffix}
                  </span>
                </div>
                <span className="text-xs text-brown-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          CONTENT
          ════════════════════════════════════════ */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* Tabs — underline style */}
        <div className="flex border-b border-cream-300 mb-7">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative pb-3 px-1 mr-7 text-sm font-medium transition-colors ${
                tab === key
                  ? 'text-brown-800'
                  : 'text-brown-400 hover:text-brown-600'
              }`}
            >
              {label}
              {count !== undefined && count > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  tab === key ? 'bg-brown-100 text-brown-700' : 'bg-cream-200 text-brown-400'
                }`}>
                  {count}
                </span>
              )}
              {tab === key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brown-700 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* ── LISTINGS ── */}
        {tab === 'listings' && (
          listingsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white border border-cream-200 rounded-2xl h-64 animate-pulse" />
              ))}
            </div>
          ) : myListings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {myListings.map(p => <ProductCard key={p.id} product={p} />)}
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

        {/* ── REVIEWS ── */}
        {tab === 'reviews' && (
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

        {/* ── PHOTOS / MEDIA LIBRARY ── */}
        {tab === 'photos' && (
          <div className="space-y-6">
            {/* Upload zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(Array.from(e.dataTransfer.files)); }}
              onClick={() => fileRef.current?.click()}
              className={`group relative border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 ${
                dragOver
                  ? 'border-brown-500 bg-brown-50 scale-[1.01]'
                  : 'border-cream-400 hover:border-brown-400 hover:bg-cream-100 bg-white'
              }`}
            >
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
                  dragOver ? 'bg-brown-100' : 'bg-cream-200 group-hover:bg-cream-300'
                }`}>
                  <CloudUpload size={28} className={dragOver ? 'text-brown-600' : 'text-brown-400'} />
                </div>
                <p className="font-semibold text-brown-700 mb-1">
                  {dragOver ? 'Release to upload' : 'Drag & drop your product photos'}
                </p>
                <p className="text-brown-400 text-sm mb-4">or click anywhere in this area to browse</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-brown-300 bg-cream-200 px-3 py-1 rounded-full border border-cream-300">PNG</span>
                  <span className="text-xs text-brown-300 bg-cream-200 px-3 py-1 rounded-full border border-cream-300">JPG</span>
                  <span className="text-xs text-brown-300 bg-cream-200 px-3 py-1 rounded-full border border-cream-300">WEBP</span>
                  <span className="text-xs text-brown-400">· Max 10 MB</span>
                </div>
              </div>

              {/* API badge */}
              <div className="absolute top-3 right-3 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">
                API coming soon
              </div>
            </div>

            <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={e => { handleFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />

            {/* Quick-add demo button */}
            <button
              onClick={addSample}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-brown-600 hover:text-brown-800 bg-white hover:bg-cream-100 border border-cream-300 rounded-xl transition-colors"
            >
              <Plus size={15} /> Add sample photo (demo)
            </button>

            {/* Photo grid */}
            {photos.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-brown-800">
                    Media Library
                    <span className="ml-2 text-sm font-normal text-brown-400">
                      {photos.filter(p => p.status === 'done').length} of {photos.length} uploaded
                    </span>
                  </h3>
                  <button className="text-xs font-medium text-brown-500 hover:text-brown-800 bg-cream-100 border border-cream-300 px-3 py-1.5 rounded-lg transition-colors">
                    Save all to listing
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {photos.map(photo => (
                    <div key={photo.id} className="group relative bg-white border border-cream-200 rounded-xl overflow-hidden shadow-soft">
                      {/* Image */}
                      <div className="relative aspect-square bg-cream-200">
                        <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />

                        {/* Upload spinner */}
                        {photo.status === 'uploading' && (
                          <div className="absolute inset-0 bg-white/75 backdrop-blur-sm flex items-center justify-center">
                            <div className="w-7 h-7 border-2 border-cream-300 border-t-brown-600 rounded-full animate-spin" />
                          </div>
                        )}

                        {/* Hover overlay */}
                        {photo.status === 'done' && (
                          <div className="absolute inset-0 bg-brown-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-between p-2">
                            <button
                              onClick={() => setPhotos(p => p.filter(ph => ph.id !== photo.id))}
                              className="w-7 h-7 bg-red-500 text-white rounded-lg flex items-center justify-center hover:bg-red-600 transition-colors"
                            >
                              <X size={13} />
                            </button>
                            <div className="w-7 h-7 bg-green-500 text-white rounded-lg flex items-center justify-center">
                              <CheckCircle2 size={13} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Caption */}
                      <div className="px-2.5 py-2">
                        <p className="text-xs text-brown-400 truncate mb-1.5">{photo.name}</p>
                        <input
                          value={photo.caption}
                          onChange={e => setPhotos(p => p.map(ph => ph.id === photo.id ? { ...ph, caption: e.target.value } : ph))}
                          placeholder="Caption…"
                          className="w-full text-xs bg-cream-100 border border-cream-200 rounded-lg px-2.5 py-1.5 text-brown-700 placeholder-brown-300 focus:outline-none focus:ring-1 focus:ring-brown-300 transition-all"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════
          EDIT PROFILE MODAL
          ════════════════════════════════════════ */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Profile" maxWidth="max-w-lg">
        <div className="space-y-4">
          {/* Avatar row */}
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
            <label className="block text-sm font-medium text-brown-700 mb-1.5">
              Bio
              <span className="text-brown-400 font-normal ml-1">({editForm.bio.length}/160)</span>
            </label>
            <textarea
              value={editForm.bio}
              onChange={e => setEditForm(f => ({ ...f, bio: e.target.value.slice(0, 160) }))}
              rows={3}
              className="input-field resize-none"
              placeholder="Tell renters a little about yourself…"
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

/* ─── Small reusable empty state ─── */
function EmptyState({
  icon, title, desc, cta, onCta,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta?: string;
  onCta?: () => void;
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
