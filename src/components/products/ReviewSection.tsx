import { useState, useEffect, useCallback } from 'react';
import { Star, PenLine, CheckCircle2, Lock, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import Button from '../ui/Button';
import UserAvatar from '../ui/UserAvatar';

/* ─── Types ─── */
interface ApiReview {
  _id: string;
  productId: string;
  userId: { _id: string; username: string; name?: string; avatar?: string };
  rating: number;
  comment: string;
  createdAt: string;
}

interface ReviewSectionProps {
  productId: string;
  isOwner?: boolean;
}

/* ─── Sub-components ─── */
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

function ReviewCard({
  review,
  canDelete,
  onDelete,
  deleting,
}: {
  review: ApiReview;
  canDelete: boolean;
  onDelete: () => void;
  deleting: boolean;
}) {
  const authorName = review.userId?.name || review.userId?.username || 'User';
  const authorAvatar = review.userId?.avatar || '';

  return (
    <div className="bg-cream-50 border border-cream-200 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <UserAvatar
            name={authorName}
            avatar={authorAvatar}
            className="w-10 h-10 rounded-xl object-cover ring-1 ring-cream-300"
            textClassName="text-sm font-bold"
          />
          <div>
            <p className="font-semibold text-brown-800 text-sm">{authorName}</p>
            <p className="text-brown-400 text-xs">
              {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              {' · '}
              <span className="font-medium text-brown-500">Rented</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
              <Star key={n} size={13} className={n <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-brown-200'} />
            ))}
          </div>
          {canDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              disabled={deleting}
              className="ml-1 p-1.5 rounded-lg text-brown-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-40"
              title="Delete your review"
            >
              {deleting
                ? <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                : <Trash2 size={14} />}
            </button>
          )}
        </div>
      </div>
      <p className="text-brown-500 text-sm leading-relaxed">{review.comment}</p>
    </div>
  );
}

/* ─── Main Component ─── */
export default function ReviewSection({ productId, isOwner = false }: ReviewSectionProps) {
  const { isAuthenticated, user } = useAuth();
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ rating: 0, comment: '' });
  const [errors, setErrors] = useState({ rating: '', comment: '' });
  const [submitError, setSubmitError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [canReviewStatus, setCanReviewStatus] = useState(false);

  /* ── Fetch reviews from API ── */
  const fetchReviews = useCallback(() => {
    setReviewsLoading(true);
    api.reviews.getProductReviews(productId)
      .then(res => setReviews((res.data as ApiReview[]) ?? []))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
  }, [productId]);

  const checkReviewStatus = useCallback(() => {
    if (isAuthenticated) {
      api.reviews.checkCanReview(productId)
        .then(res => setCanReviewStatus(res.canReview))
        .catch(() => setCanReviewStatus(false));
    }
  }, [productId, isAuthenticated]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchReviews();
      checkReviewStatus();
    });
  }, [fetchReviews, checkReviewStatus]);

  /* ── Derived ── */
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '—';

  const ratingDist = [5, 4, 3, 2, 1].map(n => ({
    star: n,
    count: reviews.filter(r => r.rating === n).length,
    pct: reviews.length ? Math.round((reviews.filter(r => r.rating === n).length / reviews.length) * 100) : 0,
  }));

  const canReview = canReviewStatus && !submitted;

  /* ── Validation ── */
  const validate = () => {
    const e = { rating: '', comment: '' };
    if (!form.rating) e.rating = 'Please select a rating';
    if (form.comment.trim().length < 20) e.comment = 'Write at least 20 characters';
    setErrors(e);
    return !Object.values(e).some(Boolean);
  };

  /* ── Submit review via API ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canReview) return;
    if (!validate()) return;
    setLoading(true);
    setSubmitError('');
    try {
      await api.reviews.addReview(productId, {
        rating: form.rating,
        comment: form.comment.trim(),
      });
      setSubmitted(true);
      setShowForm(false);
      setForm({ rating: 0, comment: '' });
      fetchReviews(); // Refresh list from server
    } catch (err) {
      setSubmitError((err as Error).message ?? 'Failed to post review. Try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Delete review ── */
  const handleDelete = async (reviewId: string) => {
    if (!confirm('Delete this review? This cannot be undone.')) return;
    setDeletingId(reviewId);
    try {
      await api.reviews.deleteReview(reviewId);
      fetchReviews(); // Refresh list from server
      checkReviewStatus(); // Re-check if they can review
      // If user deleted their own review, allow them to write a new one
      setSubmitted(false);
    } catch {
      // silently fail
    } finally {
      setDeletingId(null);
    }
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

          {/* Comment */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-brown-700 mb-1.5">
              Your review
              <span className="text-brown-400 font-normal ml-1">({form.comment.length} chars)</span>
            </label>
            <textarea
              value={form.comment}
              onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
              placeholder="Tell others about the item condition, the renter's responsiveness, pickup/drop-off experience…"
              rows={4}
              className="input-field resize-none"
            />
            {errors.comment && <p className="text-red-500 text-xs mt-1">{errors.comment}</p>}
          </div>

          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-600 mb-4">{submitError}</div>
          )}

          <div className="flex gap-3">
            <Button type="submit" loading={loading} className="flex-1">Post Review</Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Review list */}
      {reviewsLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white border border-cream-200 rounded-2xl h-28 animate-pulse" />
          ))}
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map(r => (
            <ReviewCard
              key={r._id}
              review={r}
              canDelete={!!user && r.userId?._id === user.id}
              onDelete={() => handleDelete(r._id)}
              deleting={deletingId === r._id}
            />
          ))}
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
