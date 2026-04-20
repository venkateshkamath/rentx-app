import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  reviewCount?: number;
  size?: number;
}

export default function StarRating({ rating, reviewCount, size = 14 }: StarRatingProps) {
  return (
    <span className="inline-flex items-center gap-1">
      <Star size={size} className="fill-amber-400 text-amber-400" />
      <span className="font-semibold text-brown-800 text-sm">{rating.toFixed(1)}</span>
      {reviewCount !== undefined && (
        <span className="text-brown-400 text-xs">({reviewCount})</span>
      )}
    </span>
  );
}
