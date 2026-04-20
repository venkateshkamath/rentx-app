import type { ListingType } from '../../types';

interface BadgeProps {
  type: ListingType;
  size?: 'sm' | 'md';
}

export default function Badge({ type, size = 'sm' }: BadgeProps) {
  const base = size === 'sm'
    ? 'text-xs px-2.5 py-0.5'
    : 'text-sm px-3 py-1';

  return type === 'rent' ? (
    <span className={`inline-flex items-center rounded-full bg-brown-100 font-semibold text-brown-700 ${base}`}>
      Rent
    </span>
  ) : (
    <span className={`inline-flex items-center rounded-full bg-amber-100 font-semibold text-amber-700 ${base}`}>
      Exchange
    </span>
  );
}
