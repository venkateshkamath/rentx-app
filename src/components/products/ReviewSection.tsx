import { useState } from 'react';
import { Star, PenLine, CheckCircle2, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { Review } from '../../types';
import Button from '../ui/Button';

interface ReviewSectionProps {
  productId: string;
  initialReviews: Review[];
  isOwner?: boolean;
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={24}
            className={`transition-colors ${n <= (hovered || value) ? 'fill-amber-400 text-amber-400' : 'text-brown-200'}`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="bg-cream-50 border border-cream-200 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <img
            src={review.authorAvatar}
            alt={review.authorName}
            className="w-10 h-10 rounded-xl object-cover ring-1 ring-cream-300"
          />
          <div>
            <p className="font-semibold text-brown-800 text-sm">{review.authorName}</p>
            <p className="text-brown-400 text-xs">
              {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              {' · '}
              <span className="font-medium text-brown-500">Rented</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {[1, 2, 3, 4, 5].map(n => (
            <Star key={n} size={13} className={n <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-brown-200'} />
          ))}
        </div>
      </div>
      <h4 className="font-semibold text-brown-800 text-sm mb-1">{review.title}</h4>
      <p className="text-brown-500 text-sm leading-relaxed">{review.body}</p>
    </div>
  );
}

export default function ReviewSection({ productId, initialReviews, isOwner = false }: ReviewSectionProps) {
  const { isAuthenticated, user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ rating: 0, title: '', body: '' });
  const [errors, setErrors] = useState({ rating: '', title: '', body: '' });

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '—';

  const ratingDist = [5, 4, 3, 2, 1].map(n => ({
    star: n,
    count: reviews.filter(r => r.rating === n).length,
    pct: reviews.length ? Math.round((reviews.filter(r => r.rating === n).length / reviews.length) * 100) : 0,
  }));

  const hasAlreadyReviewed = !!user && reviews.some(r => r.authorId === user.id);
  const canReview = isAuthenticated && !!user && !isOwner && !hasAlreadyReviewed && !submitted;

  const validate = () => {
    const e = { rating: '', title: '', body: '' };
    if (!form.rating) e.rating = 'Please select a rating';
    if (!form.title.trim()) e.title = 'Add a short title';
    if (form.body.trim().length < 20) e.body = 'Write at least 20 characters';
    setErrors(e);
    return !Object.values(e).some(Boolean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canReview) return;
    if (!validate()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    const newReview: Review = {
      id: `r-new-${Date.now()}`,
      authorId: user.id,
      authorName: user.name,
      authorAvatar: user.avatar,
      productId,
      rating: form.rating,
      title: form.title,
      body: form.body,
      createdAt: new Date().toISOString().slice(0, 10),
      transactionType: 'rent',
    };
    setReviews(prev => [newReview, ...prev]);
    setLoading(false);
    setSubmitted(true);
    setShowForm(false);
  };

  return (
    <div className="mt-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-brown-900">Reviews</h2>
          <p className="text-brown-400 text-sm">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
        </div>
        {canReview && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(s => !s)}
          >
            <PenLine size={14} />
            {showForm ? 'Cancel' : 'Write a Review'}
          </Button>
        )}
        {isOwner && (
          <span className="text-xs text-brown-400 italic">Owners can't review their own listing</span>
        )}
        {!isAuthenticated && (
          <div className="flex items-center gap-1.5 text-xs text-brown-400">
            <Lock size={12} /> Sign in to review
          </div>
        )}
      </div>

      {/* Rating summary */}
      {reviews.length > 0 && (
        <div className="bg-white border border-cream-200 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
          <div className="text-center shrink-0">
            <div className="text-5xl font-bold text-brown-900 leading-none mb-1">{avgRating}</div>
            <div className="flex justify-center gap-0.5 mb-1">
              {[1,2,3,4,5].map(n => (
                <Star key={n} size={14} className={n <= Math.round(Number(avgRating)) ? 'fill-amber-400 text-amber-400' : 'text-brown-200'} />
              ))}
            </div>
            <p className="text-brown-400 text-xs">{reviews.length} total</p>
          </div>

          <div className="flex-1 w-full space-y-1.5">
            {ratingDist.map(({ star, count, pct }) => (
              <div key={star} className="flex items-center gap-2.5">
                <span className="text-xs text-brown-500 w-3 shrink-0">{star}</span>
                <Star size={11} className="fill-amber-400 text-amber-400 shrink-0" />
                <div className="flex-1 h-1.5 bg-cream-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-brown-400 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success toast */}
      {submitted && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-5">
          <CheckCircle2 size={18} className="text-green-500 shrink-0" />
          <p className="text-sm text-green-700 font-medium">Your review has been posted. Thank you!</p>
        </div>
      )}

      {/* Write review form */}
      {showForm && canReview && (
        <form onSubmit={handleSubmit} className="bg-white border border-brown-200 rounded-2xl p-5 mb-6 shadow-soft">
          <h3 className="font-semibold text-brown-800 mb-4">Share your experience</h3>

          {/* Stars */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-brown-700 mb-2">Your rating</label>
            <StarPicker value={form.rating} onChange={v => setForm(f => ({ ...f, rating: v }))} />
            {errors.rating && <p className="text-red-500 text-xs mt-1">{errors.rating}</p>}
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-brown-700 mb-1.5">Review title</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Summarise your experience in a line"
              className="input-field"
              maxLength={80}
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>

          {/* Body */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-brown-700 mb-1.5">
              Detailed review
              <span className="text-brown-400 font-normal ml-1">({form.body.length} chars)</span>
            </label>
            <textarea
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              placeholder="Tell others about the item condition, the renter's responsiveness, pickup/drop-off experience…"
              rows={4}
              className="input-field resize-none"
            />
            {errors.body && <p className="text-red-500 text-xs mt-1">{errors.body}</p>}
          </div>

          <div className="flex gap-3">
            <Button type="submit" loading={loading} className="flex-1">Post Review</Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Review list */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map(r => <ReviewCard key={r.id} review={r} />)}
        </div>
      ) : (
        <div className="text-center py-12 bg-white border border-cream-200 rounded-2xl">
          <div className="text-4xl mb-3">⭐</div>
          <p className="text-brown-500 text-sm font-medium">No reviews yet</p>
          {canReview && (
            <p className="text-brown-400 text-xs mt-1">Be the first to review this item!</p>
          )}
        </div>
      )}
    </div>
  );
}
