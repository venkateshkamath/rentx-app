import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Star } from 'lucide-react';
import type { Product } from '../../types';
import UserAvatar from '../ui/UserAvatar';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="group flex min-h-full flex-col overflow-hidden rounded-lg border border-cream-300 bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
    >
      <div className="relative overflow-hidden aspect-[4/3] bg-cream-200">
        <img
          src={product.images[0].url}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute top-2.5 left-2.5 rounded-full bg-brown-100 px-2.5 py-0.5 text-xs font-semibold text-brown-700 shadow-soft">
          Rent
        </div>
        <div className="absolute top-2.5 right-2.5">
          <span className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-brown-600 shadow-soft backdrop-blur-sm">
            {product.condition}
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="mb-1.5 line-clamp-2 text-base font-bold leading-snug text-brown-900 transition-colors group-hover:text-brown-700">
          {product.title}
        </h3>

        <div className="flex items-center gap-1 text-brown-400 text-xs mb-3">
          <MapPin size={11} />
          <span>{product.location}</span>
        </div>

        <div className="mt-auto flex items-center justify-between">
          <div>
            <div>
              <span className="text-brown-800 font-bold text-base">₹{product.price}</span>
              <span className="text-brown-400 text-xs"> /day</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            <span className="text-brown-700 text-xs font-medium">{product.rating}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-cream-200 pt-3">
          <UserAvatar name={product.ownerName} avatar={product.ownerAvatar} className="h-7 w-7 rounded-full object-cover" textClassName="text-xs font-bold" />
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-brown-400">{product.ownerName}</span>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-brown-700 opacity-0 transition-opacity group-hover:opacity-100">
            View
            <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}
