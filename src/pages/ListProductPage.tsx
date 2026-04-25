import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, CheckCircle2, Plus, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import UserAvatar from '../components/ui/UserAvatar';
import LocationAutocomplete from '../components/ui/LocationAutocomplete';
import type { Category, Condition, LocationData } from '../types';
import { api } from '../lib/api';

const CATEGORIES: Category[] = ['Electronics', 'Furniture', 'Clothing', 'Books', 'Sports', 'Appliances', 'Vehicles', 'Tools', 'Art', 'Other'];
const CONDITIONS: Condition[] = ['Like New', 'Good', 'Fair', 'Used'];

type Step = 'details' | 'photos' | 'preview' | 'done';

interface FormData {
  title: string;
  description: string;
  category: Category | '';
  condition: Condition | '';
  price: string;
  originalPrice: string;
  location: LocationData | null;
}

const STEPS: { key: Step; label: string }[] = [
  { key: 'details', label: 'Details' },
  { key: 'photos',  label: 'Photos'  },
  { key: 'preview', label: 'Preview' },
];

export default function ListProductPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('details');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitError, setSubmitError] = useState('');

  const [form, setForm] = useState<FormData>({
    title: '', description: '', category: '', condition: '',
    price: '', originalPrice: '', location: user?.location ?? null,
  });

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const remaining = 5 - imageFiles.length;
    const toAdd = files.slice(0, remaining);
    setImageFiles(prev => [...prev, ...toAdd]);
    setImagePreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))]);
    // Reset input so same file can be re-selected if removed
    if (e.target) e.target.value = '';
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.title.trim())       e.title       = 'Title is required';
    if (!form.description.trim()) e.description = 'Description is required';
    if (!form.category)           e.category    = 'Select a category';
    if (!form.condition)          e.condition   = 'Select condition';
    if (!form.price || isNaN(Number(form.price))) e.price = 'Enter a valid rent price';
    if (!form.originalPrice || isNaN(Number(form.originalPrice))) e.originalPrice = 'Enter a valid original price';
    if (!form.location)                e.location    = 'Location is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (imageFiles.length === 0) {
      setSubmitError('Please add at least one photo.');
      return;
    }
    setLoading(true);
    setSubmitError('');

    try {
      const formData = new FormData();
      formData.append('productName', form.title);
      formData.append('productPrice', form.price);
      formData.append('productOriginalPrice', form.originalPrice);
      formData.append('description', form.description);
      formData.append('category', form.category);
      formData.append('condition', form.condition);
      formData.append('location', JSON.stringify(form.location));
      formData.append('email', user.email);
      imageFiles.forEach(file => formData.append('images', file));
      await api.products.create(formData);
      setStep('done');
    } catch (err) {
      setSubmitError((err as Error).message ?? 'Failed to publish. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Guard ── */
  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">📦</div>
          <h2 className="text-xl font-semibold text-brown-800 mb-2">Sign in to post an item</h2>
          <p className="text-brown-400 text-sm mb-5">Create a free account to list your item for rent.</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate('/login')}>Sign In</Button>
            <Button variant="secondary" onClick={() => navigate('/register')}>Join Free</Button>
          </div>
        </div>
      </div>
    );
  }

  const stepIdx = STEPS.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-cream-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">

        {step !== 'done' && (
          <>
            <div className="mb-7">
              <h1 className="text-2xl font-semibold text-brown-900">Post an Item</h1>
              <p className="text-brown-400 text-sm mt-1">Fill in the details to list your item on RentX</p>
            </div>

            <div className="flex items-center gap-1 mb-8">
              {STEPS.map((s, i) => (
                <div key={s.key} className="flex items-center flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-all ${
                    i < stepIdx  ? 'bg-brown-500 text-white' :
                    i === stepIdx ? 'bg-brown-700 text-white ring-4 ring-brown-200' :
                                    'bg-cream-300 text-brown-400'
                  }`}>
                    {i < stepIdx ? '✓' : i + 1}
                  </div>
                  <span className={`ml-1 text-xs hidden sm:inline ${i === stepIdx ? 'text-brown-700 font-medium' : 'text-brown-300'}`}>{s.label}</span>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 rounded-full ${i < stepIdx ? 'bg-brown-400' : 'bg-cream-300'}`} />
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <div className="bg-white rounded-2xl border border-cream-300 shadow-card p-6 md:p-8">

          {/* ── STEP 1: DETAILS ── */}
          {step === 'details' && (
            <div>
              <h2 className="text-lg font-semibold text-brown-800 mb-1">Item Details</h2>
              <p className="text-brown-400 text-sm mb-6">Tell renters everything they need to know</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brown-700 mb-1.5">
                    Title <span className="text-brown-400 font-normal">({form.title.length}/80)</span>
                  </label>
                  <input
                    value={form.title}
                    onChange={e => set('title', e.target.value.slice(0, 80))}
                    placeholder="e.g. Sony A7 III Camera with 24-70mm Lens"
                    className="input-field"
                  />
                  {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-brown-700 mb-1.5">Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                    placeholder="Describe your item — condition, accessories, any usage limits…"
                    rows={3}
                    className="input-field resize-none"
                  />
                  {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brown-700 mb-1.5">Category</label>
                    <select value={form.category} onChange={e => set('category', e.target.value as Category)} className="input-field">
                      <option value="">Select…</option>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                    {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-700 mb-1.5">Condition</label>
                    <select value={form.condition} onChange={e => set('condition', e.target.value as Condition)} className="input-field">
                      <option value="">Select…</option>
                      {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                    </select>
                    {errors.condition && <p className="text-red-500 text-xs mt-1">{errors.condition}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brown-700 mb-1.5">Original Price (₹)</label>
                    <input
                      type="number"
                      value={form.originalPrice}
                      onChange={e => set('originalPrice', e.target.value)}
                      placeholder="e.g. 50000"
                      min={0}
                      className="input-field"
                    />
                    {errors.originalPrice && <p className="text-red-500 text-xs mt-1">{errors.originalPrice}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-700 mb-1.5">Rent per day (₹)</label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={e => set('price', e.target.value)}
                      placeholder="e.g. 500"
                      min={0}
                      className="input-field"
                    />
                    {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-brown-700 mb-1.5">Pickup Location</label>
                    <LocationAutocomplete
                      value={form.location}
                      onChange={loc => set('location', loc)}
                      placeholder="Search pickup city…"
                      className="input-field"
                    />
                    {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
                  </div>
                </div>

              </div>

              <Button className="w-full mt-7" onClick={() => { if (validate()) setStep('photos'); }}>
                Next: Add Photos <ArrowRight size={16} />
              </Button>
            </div>
          )}

          {/* ── STEP 2: PHOTOS ── */}
          {step === 'photos' && (
            <div>
              <h2 className="text-lg font-semibold text-brown-800 mb-1">Add Photos</h2>
              <p className="text-brown-400 text-sm mb-6">Up to 5 photos — first one is the cover. Clear photos get more responses.</p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />

              <div className="grid grid-cols-3 gap-3 mb-4">
                {imagePreviews.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    {i === 0 && (
                      <span className="absolute bottom-1.5 left-1.5 bg-brown-800/80 text-cream-100 text-xs px-2 py-0.5 rounded-full">Cover</span>
                    )}
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-soft"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}

                {imagePreviews.length < 5 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-brown-200 hover:border-brown-400 hover:bg-cream-100 flex flex-col items-center justify-center gap-1.5 text-brown-400 hover:text-brown-600 transition-all"
                  >
                    <Plus size={20} />
                    <span className="text-xs font-medium">Add photo</span>
                  </button>
                )}
              </div>

              <div
                className="bg-cream-100 border border-dashed border-brown-200 rounded-xl p-5 flex flex-col items-center text-center mb-6 cursor-pointer hover:border-brown-400 hover:bg-cream-200 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={22} className="text-brown-300 mb-2" />
                <p className="text-sm text-brown-500 font-medium">Drag & drop or click to upload</p>
                <p className="text-xs text-brown-300 mt-0.5">PNG, JPG, WEBP · up to 10 MB each</p>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep('details')} className="flex-1">
                  <ArrowLeft size={16} /> Back
                </Button>
                <Button onClick={() => setStep('preview')} className="flex-1">
                  Preview Listing <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 3: PREVIEW ── */}
          {step === 'preview' && (
            <div>
              <h2 className="text-lg font-semibold text-brown-800 mb-1">Preview</h2>
              <p className="text-brown-400 text-sm mb-5">This is how your listing will appear to others</p>

              <div className="rounded-xl border border-cream-200 overflow-hidden mb-6 shadow-soft">
                {imagePreviews.length > 0 ? (
                  <img src={imagePreviews[0]} alt="Cover" className="w-full h-52 object-cover" />
                ) : (
                  <div className="w-full h-52 bg-cream-200 flex items-center justify-center">
                    <Upload size={32} className="text-brown-300" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="rounded-full bg-brown-100 px-2.5 py-0.5 text-xs font-semibold text-brown-700">Rent</span>
                    {form.condition && <span className="text-xs text-brown-400 bg-cream-100 px-2 py-0.5 rounded-full border border-cream-300">{form.condition}</span>}
                    {form.category && <span className="text-xs text-brown-400 bg-cream-100 px-2 py-0.5 rounded-full border border-cream-300">{form.category}</span>}
                  </div>
                  <h3 className="font-semibold text-brown-900 mb-1">{form.title || 'Untitled listing'}</h3>
                  <p className="text-brown-500 text-sm line-clamp-2 mb-3">{form.description}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-brown-800 text-lg">₹{form.price || '0'}<span className="text-xs font-normal text-brown-400">/day</span></span>
                      {form.originalPrice && (
                        <span className="text-xs text-brown-400 ml-2">Worth ₹{Number(form.originalPrice).toLocaleString('en-IN')}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <UserAvatar name={user?.name ?? ''} avatar={user?.avatar} className="w-5 h-5 rounded-full" textClassName="text-[9px] font-bold" />
                      <span className="text-xs text-brown-400">{user?.name}</span>
                    </div>
                  </div>
                  {form.location && <p className="text-xs text-brown-400 mt-2">📍 {form.location.name}</p>}
                </div>
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-600 mb-4">{submitError}</div>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep('photos')} className="flex-1">
                  <ArrowLeft size={16} /> Edit
                </Button>
                <Button onClick={handleSubmit} loading={loading} className="flex-1">
                  Publish Listing
                </Button>
              </div>
            </div>
          )}

          {/* ── DONE ── */}
          {step === 'done' && (
            <div className="text-center py-10">
              <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={40} className="text-green-500" />
              </div>
              <h2 className="text-2xl font-semibold text-brown-900 mb-2">Listing Published!</h2>
              <p className="text-brown-400 text-sm mb-7 max-w-xs mx-auto">
                Your item is now live on RentX. Renters can discover and contact you directly.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => navigate('/')}>Browse Listings</Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setStep('details');
                    setForm({ title: '', description: '', category: '', condition: '', price: '', originalPrice: '', location: user?.location ?? null });
                    setErrors({});
                    imagePreviews.forEach(url => URL.revokeObjectURL(url));
                    setImageFiles([]);
                    setImagePreviews([]);
                    setSubmitError('');
                  }}
                >
                  Post Another
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
