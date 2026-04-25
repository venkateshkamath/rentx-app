import type { Category, Condition, LocationData, Product } from '../types';

const VALID_CATEGORIES = new Set<string>([
  'Electronics', 'Furniture', 'Clothing', 'Books',
  'Sports', 'Appliances', 'Vehicles', 'Tools', 'Art', 'Other',
]);

const VALID_CONDITIONS = new Set<string>(['Like New', 'Good', 'Fair', 'Used']);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapApiProduct(p: any): Product {
  return {
    id: p._id,
    mongoId: p._id,
    title: p.productName ?? 'Untitled',
    description: p.description ?? '',
    images: Array.isArray(p.images) && p.images.length > 0
      ? p.images.map((img: { url: string }) => ({ url: img.url }))
      : [{ url: 'https://placehold.co/600x400?text=No+Image' }],
    price: p.rentPrice ?? p.productPrice ?? 0,
    category: VALID_CATEGORIES.has(p.category) ? (p.category as Category) : 'Other',
    condition: VALID_CONDITIONS.has(p.condition) ? (p.condition as Condition) : 'Good',
    type: 'rent',
    location: ((): LocationData => {
      if (p.location && typeof p.location === 'object' && p.location.placeId) {
        return p.location as LocationData;
      }
      // Legacy: plain string location
      return { placeId: '', name: typeof p.location === 'string' ? p.location : '', lat: 0, lng: 0 };
    })(),
    ownerId: (typeof p.userId === 'object' ? p.userId?._id : p.userId) ?? '',
    ownerName: (typeof p.userId === 'object' ? p.userId?.username : p.username) ?? 'Unknown',
    ownerAvatar: '',
    rating: 4.0,
    reviewCount: 0,
    createdAt: p.createdAt ?? new Date().toISOString(),
    tags: Array.isArray(p.tags) ? p.tags : [],
    available: p.status === 'available',
  };
}
