const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

import type { LocationData } from "../types";

const DEFAULT_CACHE_TTL_MS = 60_000;

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

interface RequestOptions {
  cacheTtlMs?: number;
}

const responseCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<unknown>>();
let cacheEpoch = 0;

export function getToken(): string | null {
  return localStorage.getItem("rentx_token");
}

export function setToken(token: string): void {
  localStorage.setItem("rentx_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("rentx_token");
  localStorage.removeItem("rentx_user");
  clearApiCache();
}

export function clearApiCache(match?: string): void {
  if (!match) {
    cacheEpoch += 1;
    responseCache.clear();
    inFlightRequests.clear();
    return;
  }

  for (const key of responseCache.keys()) {
    if (key.includes(match)) responseCache.delete(key);
  }
  for (const key of inFlightRequests.keys()) {
    if (key.includes(match)) inFlightRequests.delete(key);
  }
}

async function request<T = unknown>(
  path: string,
  init: RequestInit = {},
  options: RequestOptions = {},
): Promise<T> {
  const token = getToken();
  const isFormData = init.body instanceof FormData;
  const method = (init.method ?? "GET").toUpperCase();
  const shouldCache = method === "GET" && (options.cacheTtlMs ?? 0) > 0;
  const cacheKey = `${method}:${path}:${token ?? "guest"}`;
  const requestEpoch = cacheEpoch;

  if (shouldCache) {
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }

    const inFlight = inFlightRequests.get(cacheKey);
    if (inFlight) return inFlight as Promise<T>;
  }

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const fetchPromise = fetch(`${BASE}${path}`, { ...init, headers })
    .then(async res => {
      const data = await res.json();

      if (!res.ok) {
        throw new Error((data as { message?: string }).message ?? "Request failed");
      }

      if (method !== "GET") clearApiCache();
      if (shouldCache && requestEpoch === cacheEpoch) {
        responseCache.set(cacheKey, {
          expiresAt: Date.now() + (options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS),
          value: data,
        });
      }

      return data as T;
    })
    .finally(() => {
      if (shouldCache) inFlightRequests.delete(cacheKey);
    });

  if (shouldCache) inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),

    register: (payload: {
      name: string;
      username: string;
      email: string;
      password: string;
      phone: string;
      location: LocationData;
    }) =>
      request("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    verifyEmail: (email: string) =>
      request("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),

    confirmOtp: (email: string, otp: string, purpose?: string) =>
      request("/auth/confirm-otp", {
        method: "POST",
        body: JSON.stringify({ email, otp, ...(purpose && { purpose }) }),
      }),

    resetPassword: (email: string, resetToken: string, newPassword: string) =>
      request("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, resetToken, newPassword }),
      }),

    updateAvatar: (formData: FormData) =>
      request<{ success: boolean; avatar: string }>("/auth/avatar", {
        method: "PATCH",
        body: formData,
      }),

    changePassword: (oldPassword: string, newPassword: string) =>
      request<{ success: boolean; message: string }>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ oldPassword, newPassword }),
      }),

    updateProfile: (body: { name?: string; location?: unknown }) =>
      request<{ success: boolean; data: unknown }>("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
  },

  chat: {
    getAll: () => request<{ success: boolean; data: unknown[] }>("/chat"),
    uploadImage: (formData: FormData) =>
      request<{ success: boolean; url: string; publicId: string }>(
        "/chat/image",
        { method: "POST", body: formData },
      ),
  },

  products: {
    getAll: () => request<{ success: boolean; data: unknown[] }>("/products", {}, { cacheTtlMs: DEFAULT_CACHE_TTL_MS }),
    getById: (id: string) =>
      request<{ success: boolean; data: unknown }>(`/products/${id}`, {}, { cacheTtlMs: DEFAULT_CACHE_TTL_MS }),
    getUserProducts: () =>
      request<{ success: boolean; data: unknown[] }>("/products/user", {}, { cacheTtlMs: 30_000 }),
    create: (formData: FormData) =>
      request("/products", { method: "POST", body: formData }),

    update: (id: string, body: Record<string, unknown> | FormData) =>
      request(`/products/${id}`, {
        method: "PATCH",
        body: body instanceof FormData ? body : JSON.stringify(body),
      }),

    getChatParticipants: (id: string) =>
      request<{ success: boolean; data: unknown[] }>(
        `/products/${id}/chat-participants`,
      ),

    getMyRentals: () =>
      request<{ success: boolean; data: unknown[] }>("/products/my-rentals", {}, { cacheTtlMs: 30_000 }),

    updateStatus: (
      id: string,
      body: {
        status: string;
        rentedUserId?: string;
        isExternalRenter?: boolean;
        startDate?: string;
        endDate?: string;
      },
    ) =>
      request("/products/update-status", {
        method: "POST",
        body: JSON.stringify({ product_id: id, ...body }),
      }),

    getRentalHistory: () =>
      request<{
        success: boolean;
        data: { rentedOut: unknown[]; rentedFrom: unknown[] };
      }>("/products/rental-history", {}, { cacheTtlMs: 30_000 }),
  },

  reviews: {
    getUserReviews: () =>
      request<{ success: boolean; count: number; data: unknown[] }>(
        "/reviews/user",
      ),

    getReceivedReviews: () =>
      request<{ success: boolean; count: number; data: unknown[] }>(
        "/reviews/received",
      ),

    getProductReviews: (productId: string) =>
      request<{
        success: boolean;
        count: number;
        averageRating: number;
        data: unknown[];
      }>(`/reviews/${productId}`),

    addReview: (productId: string, body: { rating: number; comment: string }) =>
      request<{ success: boolean; data: unknown }>(`/reviews/${productId}`, {
        method: "POST",
        body: JSON.stringify(body),
      }),

    deleteReview: (reviewId: string) =>
      request<{ success: boolean }>(`/reviews/${reviewId}`, {
        method: "DELETE",
      }),

    checkCanReview: (productId: string) =>
      request<{ success: boolean; canReview: boolean }>(
        `/reviews/${productId}/can-review`,
      ),
  },
};
