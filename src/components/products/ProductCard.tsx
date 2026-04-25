import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, IndianRupee } from 'lucide-react';
import type { Product } from '../../types';
import UserAvatar from '../ui/UserAvatar';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="group flex min-h-full flex-col overflow-hidden rounded-2xl border border-cream-300 bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
    >
      {/* Image */}
      <div className="relative overflow-hidden aspect-[4/3] bg-cream-200">
        <img
          src={product.images[0].url}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {/* Top-left badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="rounded-full bg-brown-800/80 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-bold text-cream-100 uppercase tracking-wide shadow-soft">
            Rent
          </span>
          {product.category && product.category !== 'Other' && (
            <span className="rounded-full bg-white/85 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-brown-600 shadow-soft">
              {product.category}
            </span>
          )}
        </div>
        {/* Top-right condition */}
        <span className="absolute top-2.5 right-2.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-brown-600 shadow-soft backdrop-blur-sm">
          {product.condition}
        </span>
        {/* Bottom gradient overlay for price readability */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
        {/* Price overlay on image */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between">
          <div>
            <span className="text-white font-bold text-lg drop-shadow-md">₹{product.price}</span>
            <span className="text-white/80 text-[11px] ml-0.5">/day</span>
          </div>
          {product.originalPrice > 0 && (
            <span className="text-white/75 text-[10px] font-medium drop-shadow-md">
              Worth ₹{product.originalPrice.toLocaleString('en-IN')}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5 flex flex-col flex-1">
        <h3 className="mb-1 line-clamp-2 text-sm font-bold leading-snug text-brown-900 transition-colors group-hover:text-brown-700">
          {product.title}
        </h3>

        {product.description && (
          <p className="text-brown-400 text-[11px] leading-relaxed line-clamp-2 mb-2">{product.description}</p>
        )}

        <div className="flex items-center gap-1 text-brown-400 text-[11px] mb-2">
          <MapPin size={10} className="shrink-0" />
          <span className="truncate">{product.location?.name || 'Unknown'}</span>
        </div>

        {/* Owner bar */}
        <div className="mt-auto flex items-center gap-2 border-t border-cream-200 pt-2.5">
          <UserAvatar name={product.ownerName} avatar={product.ownerAvatar} className="h-6 w-6 rounded-full object-cover" textClassName="text-[10px] font-bold" />
          <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-brown-500">{product.ownerName}</span>
          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-brown-700 opacity-0 transition-opacity group-hover:opacity-100">
            View <ArrowRight size={11} />
          </span>
        </div>
      </div>
    </Link>
  );
}
