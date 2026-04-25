export type ListingType = 'rent' | 'exchange';
export type Category = 'Electronics' | 'Furniture' | 'Clothing' | 'Books' | 'Sports' | 'Appliances' | 'Vehicles' | 'Tools' | 'Art' | 'Other';
export type Condition = 'Like New' | 'Good' | 'Fair' | 'Used';

export interface LocationData {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
}

export interface ProductImage {
  url: string;
  caption?: string;
}

export interface Product {
  id: string;
  mongoId?: string;  // MongoDB _id (used for chat join)
  title: string;
  description: string;
  images: ProductImage[];
  price: number;         // rent price per day
  originalPrice: number; // product original value
  category: Category;
  condition: Condition;
  type: ListingType;
  location: LocationData;
  ownerId: string;
  ownerName: string;
  ownerAvatar: string;
  rating: number;
  reviewCount: number;
  createdAt: string;
  tags: string[];
  exchangeFor?: string;  // what they want in exchange
  available: boolean;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  bio: string;
  rating: number;
  reviewCount: number;
  joinedAt: string;
  listings: number;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participants: [string, string];
  productId: string;
  productTitle: string;
  productImage: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
}

export interface Review {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  productId: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  transactionType: ListingType;
}

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  avatar: string;
  email: string;
  phone: string;
  location?: LocationData;
  createdAt?: string;
}
