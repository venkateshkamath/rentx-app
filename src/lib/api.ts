const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

import type { LocationData } from '../types';

export function getToken(): string | null {
  return localStorage.getItem('rentx_token');
}

export function setToken(token: string): void {
  localStorage.setItem('rentx_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('rentx_token');
  localStorage.removeItem('rentx_user');
}

async function request<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const isFormData = init.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error((data as { message?: string }).message ?? 'Request failed');
  }

  return data as T;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

    register: (payload: {
      name: string;
      username: string;
      email: string;
      password: string;
      phone: string;
      location: LocationData;
    }) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),

    verifyEmail: (email: string) =>
      request('/auth/verify-email', { method: 'POST', body: JSON.stringify({ email }) }),

    confirmOtp: (email: string, otp: string) =>
      request('/auth/confirm-otp', { method: 'POST', body: JSON.stringify({ email, otp }) }),

    forgotPassword: (email: string) =>
      request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

    resetPassword: (email: string, otp: string, newPassword: string) =>
      request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, otp, newPassword }) }),

    updateAvatar: (formData: FormData) =>
      request<{ success: boolean; avatar: string }>('/auth/avatar', { method: 'PATCH', body: formData }),

    changePassword: (oldPassword: string, newPassword: string) =>
      request<{ success: boolean; message: string }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ oldPassword, newPassword }),
      }),
  },

  chat: {
    getAll: () => request<{ success: boolean; data: unknown[] }>('/chat'),
    uploadImage: (formData: FormData) =>
      request<{ success: boolean; url: string; publicId: string }>('/chat/image', { method: 'POST', body: formData }),
    delete: (chatId: string) =>
      request<{ success: boolean; message: string }>(`/chat/${chatId}`, { method: 'DELETE' }),
  },

  products: {
    getAll: () => request<{ success: boolean; data: unknown[] }>('/products'),
    getById: (id: string) => request<{ success: boolean; data: unknown }>(`/products/${id}`),
    getUserProducts: () => request<{ success: boolean; data: unknown[] }>('/products/user'),
    create: (formData: FormData) =>
      request('/products', { method: 'POST', body: formData }),

    update: (id: string, body: Record<string, unknown>) =>
      request(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

    getChatParticipants: (id: string) =>
      request<{ success: boolean; data: unknown[] }>(`/products/${id}/chat-participants`),

    getMyRentals: () =>
      request<{ success: boolean; data: unknown[] }>('/products/my-rentals'),

    updateStatus: (id: string, body: {
      status: string;
      rentedUserId?: string;
      isExternalRenter?: boolean;
      startDate?: string;
      endDate?: string;
    }) =>
      request('/products/update-status', {
        method: 'POST',
        body: JSON.stringify({ product_id: id, ...body }),
      }),

    getRentalHistory: () =>
      request<{ success: boolean; data: { rentedOut: unknown[]; rentedFrom: unknown[] } }>('/products/rental-history'),
  },

  reviews: {
    getUserReviews: () =>
      request<{ success: boolean; count: number; data: unknown[] }>('/reviews/user'),

    getProductReviews: (productId: string) =>
      request<{ success: boolean; count: number; averageRating: number; data: unknown[] }>(`/reviews/${productId}`),

    addReview: (productId: string, body: { rating: number; comment: string }) =>
      request<{ success: boolean; data: unknown }>(`/reviews/${productId}`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    deleteReview: (reviewId: string) =>
      request<{ success: boolean }>(`/reviews/${reviewId}`, { method: 'DELETE' }),
  },
};
