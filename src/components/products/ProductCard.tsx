import { Link } from 'react-router-dom';
import { MapPin, Star } from 'lucide-react';
import type { Product } from '../../types';
import UserAvatar from '../ui/UserAvatar';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const imageUrl = product.images[0]?.url;

  return (
    <Link
      to={`/products/${product.id}`}
      className="group flex min-h-full flex-col overflow-hidden rounded-xl border border-cream-300 bg-cream-50 transition-all duration-200 hover:border-brown-900 hover:shadow-card"
    >
      <div className="relative overflow-hidden bg-cream-200">
        <div className="aspect-[4/3]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.title}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-700 text-brown-300">
              RentX
            </div>
          )}
        </div>

        {product.condition && (
          <span className="absolute top-3 left-3 rounded-md bg-black/50 px-2.5 py-1 text-[10px] font-800 uppercase tracking-[0.08em] text-white backdrop-blur-sm">
            {product.condition}
          </span>
        )}

        {!product.available && (
          <span className="absolute bottom-3 left-3 rounded-md bg-white px-2.5 py-1 text-[10px] font-800 uppercase tracking-[0.08em] text-red-600">
            Booked
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-[15px] font-900 leading-snug text-brown-900 transition-colors group-hover:text-accent">
            {product.title}
          </h3>
          <div className="flex shrink-0 items-center gap-1 rounded-md bg-cream-200 px-2 py-1 text-[12px] font-800 text-brown-900">
            <Star size={12} fill="currentColor" />
            {product.rating.toFixed(1)}
          </div>
        </div>

        {product.category && product.category !== 'Other' && (
          <p className="mb-2 text-[11px] font-800 uppercase tracking-[0.08em] text-brown-300">
            {product.category}
          </p>
        )}

        <div className="mb-4 mt-auto flex items-center gap-1.5 text-[12px] font-600 text-brown-500">
          <MapPin size={13} className="shrink-0 text-brown-300" />
          <span className="truncate">{product.location?.name || '—'}</span>
        </div>

        <div className="mb-4 border-y border-cream-300 py-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-800 uppercase tracking-[0.08em] text-brown-300">Daily rent</p>
              <p className="mt-0.5 text-lg font-900 text-brown-900">₹{product.price.toLocaleString('en-IN')}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-800 uppercase tracking-[0.08em] text-brown-300">Value</p>
              <p className="mt-0.5 text-sm font-800 text-brown-700">
                {product.originalPrice > 0 ? `₹${product.originalPrice.toLocaleString('en-IN')}` : '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <UserAvatar
            name={product.ownerName}
            avatar={product.ownerAvatar}
            className="h-7 w-7 shrink-0 rounded-full object-cover"
            textClassName="text-[10px] font-bold"
          />
          <span className="flex-1 truncate text-[12px] font-700 text-brown-500">{product.ownerName}</span>
          <span className="text-[11px] font-800 uppercase tracking-[0.08em] text-brown-300">
            {product.reviewCount} reviews
          </span>
        </div>
      </div>
    </Link>
  );
}
