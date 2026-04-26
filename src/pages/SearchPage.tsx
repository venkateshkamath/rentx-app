import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/products/ProductCard';
import Skeleton from '../components/ui/Skeleton';
import type { Category, Condition, Product } from '../types';
import { api } from '../lib/api';
import { mapApiProduct } from '../lib/mapProduct';
import { useAuth } from '../context/AuthContext';

const CATEGORIES: Category[] = ['Electronics', 'Furniture', 'Clothing', 'Books', 'Sports', 'Appliances', 'Vehicles', 'Tools', 'Art', 'Other'];
const CONDITIONS: Condition[] = ['Like New', 'Good', 'Fair', 'Used'];
const PRICE_STEP = 50;

export default function SearchPage() {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [selectedCategories, setSelectedCategories] = useState<Category[]>(() => {
    const category = searchParams.get('category') as Category | null;
    return category && CATEGORIES.includes(category) ? [category] : [];
  });
  const [selectedConditions, setSelectedConditions] = useState<Condition[]>([]);
  const [selectedCityPlaceId, setSelectedCityPlaceId] = useState('all');
  const [maxPrice, setMaxPrice] = useState(Infinity);
  const [sortBy, setSortBy] = useState<'relevance' | 'price-asc' | 'price-desc' | 'rating'>('relevance');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let active = true;
    api.products.getAll()
      .then(res => {
        if (!active) return;
        const mapped = (res.data as unknown[]).map(mapApiProduct);
        setProducts(mapped);
        setLoadError('');
        setApiLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setProducts([]);
        setLoadError('Could not load rentals from the API.');
        setApiLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const priceSliderMax = useMemo(() => {
    if (products.length === 0) return 5000;
    const max = Math.max(...products.map(p => p.price));
    return Math.ceil(max / PRICE_STEP) * PRICE_STEP;
  }, [products]);

  const cities = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) {
      if (p.location?.placeId && p.location.name) {
        map.set(p.location.placeId, p.location.name);
      }
    }
    return Array.from(map.entries()).map(([placeId, name]) => ({ placeId, name }));
  }, [products]);

  const activeFilterCount =
    selectedCategories.length +
    selectedConditions.length +
    (selectedCityPlaceId !== 'all' ? 1 : 0) +
    (maxPrice < priceSliderMax ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0 || !!query.trim();

  const updateQueryParam = (value: string) => {
    setQuery(value);
    const params = new URLSearchParams(searchParams);
    if (value.trim()) params.set('q', value);
    else params.delete('q');
    setSearchParams(params, { replace: true });
  };

  const toggleCategory = (cat: Category) => {
    setSelectedCategories(prev => {
      const next = prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat];
      const params = new URLSearchParams(searchParams);
      if (next.length === 1) params.set('category', next[0]);
      else params.delete('category');
      setSearchParams(params, { replace: true });
      return next;
    });
  };

  const toggleCondition = (cond: Condition) => {
    setSelectedConditions(prev => prev.includes(cond) ? prev.filter(c => c !== cond) : [...prev, cond]);
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedConditions([]);
    setSelectedCityPlaceId('all');
    setMaxPrice(Infinity);
    setQuery('');
    setSearchParams({}, { replace: true });
  };

  const filtered = useMemo(() => {
    let list = currentUserId ? products.filter(product => product.ownerId !== currentUserId) : [...products];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(product =>
        product.title.toLowerCase().includes(q) ||
        product.description.toLowerCase().includes(q) ||
        product.tags.some(tag => tag.toLowerCase().includes(q)) ||
        product.category.toLowerCase().includes(q),
      );
    }
    if (selectedCategories.length > 0) list = list.filter(product => selectedCategories.includes(product.category));
    if (selectedConditions.length > 0) list = list.filter(product => selectedConditions.includes(product.condition));
    if (selectedCityPlaceId !== 'all') list = list.filter(product => product.location?.placeId === selectedCityPlaceId);
    if (maxPrice !== Infinity) list = list.filter(product => product.price <= maxPrice);

    if (sortBy === 'price-asc') list.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') list.sort((a, b) => b.price - a.price);
    if (sortBy === 'rating') list.sort((a, b) => b.rating - a.rating);

    return list;
  }, [maxPrice, query, selectedCategories, selectedCityPlaceId, selectedConditions, sortBy, products, currentUserId]);

  const renderFilterSidebar = () => (
    <aside className="w-full space-y-6">
      <section>
        <h3 className="mb-3 text-[11px] font-800 uppercase tracking-[0.08em] text-brown-300">Category</h3>
        <div className="space-y-1.5">
          {CATEGORIES.map(category => {
            const selected = selectedCategories.includes(category);
            return (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm font-700 transition-colors ${
                  selected
                    ? 'border-brown-900 bg-brown-900 text-white'
                    : 'border-transparent bg-transparent text-brown-700 hover:border-cream-300 hover:bg-white'
                }`}
              >
                <span>{category}</span>
                {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-[11px] font-800 uppercase tracking-[0.08em] text-brown-300">Condition</h3>
        <div className="grid grid-cols-2 gap-2">
          {CONDITIONS.map(condition => {
            const selected = selectedConditions.includes(condition);
            return (
              <button
                key={condition}
                onClick={() => toggleCondition(condition)}
                className={`rounded-lg border px-3 py-2 text-sm font-700 transition-colors ${
                  selected
                    ? 'border-brown-900 bg-brown-900 text-white'
                    : 'border-cream-300 bg-white text-brown-700 hover:border-brown-900'
                }`}
              >
                {condition}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-[11px] font-800 uppercase tracking-[0.08em] text-brown-300">City</h3>
        <div className="relative">
          <select
            value={selectedCityPlaceId}
            onChange={event => setSelectedCityPlaceId(event.target.value)}
            className="h-11 w-full appearance-none rounded-lg border border-cream-300 bg-white px-3 pr-9 text-sm font-700 text-brown-900 focus:border-brown-900 focus:outline-none"
          >
            <option value="all">All cities</option>
            {cities.map(city => <option key={city.placeId} value={city.placeId}>{city.name}</option>)}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-brown-300" />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[11px] font-800 uppercase tracking-[0.08em] text-brown-300">Max rent/day</h3>
          <span className="text-sm font-900 text-brown-900">
            {maxPrice === Infinity ? 'Any' : `₹${maxPrice.toLocaleString('en-IN')}`}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={priceSliderMax}
          step={PRICE_STEP}
          value={maxPrice === Infinity ? priceSliderMax : maxPrice}
          onChange={event => {
            const val = Number(event.target.value);
            setMaxPrice(val >= priceSliderMax ? Infinity : val);
          }}
          className="w-full cursor-pointer accent-brown-900"
        />
        <div className="mt-1.5 flex justify-between text-[11px] font-700 text-brown-300">
          <span>₹0</span>
          <span>₹{priceSliderMax.toLocaleString('en-IN')}</span>
        </div>
      </section>

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-cream-300 bg-white py-2.5 text-sm font-800 text-brown-700 transition-colors hover:border-brown-900 hover:text-brown-900"
        >
          <X size={14} />
          Clear filters
        </button>
      )}
    </aside>
  );

  const renderProductSkeletons = () => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-xl border border-cream-300 bg-cream-50">
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <Skeleton className="h-7 w-14 rounded-md" />
            </div>
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <div className="border-y border-cream-300 py-3">
              <div className="flex justify-between gap-4">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-cream-100 text-brown-900">
      <section className="border-b border-cream-300 bg-cream-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_480px] lg:items-end">
            <div>
              <p className="text-xs font-800 uppercase tracking-[0.12em] text-accent">Browse rentals</p>
              <h1 className="mt-2 max-w-2xl text-3xl font-900 leading-tight text-brown-900 md:text-4xl">
                Find quality rentals without the clutter.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-brown-500">
                Search the marketplace, refine by location and price, then open the listing that fits your plan.
              </p>
            </div>

            <label className="relative block">
              <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brown-300" />
              <input
                type="text"
                value={query}
                onChange={event => updateQueryParam(event.target.value)}
                placeholder="Search cameras, bikes, sofas..."
                className="h-12 w-full rounded-xl border border-cream-300 bg-white pl-11 pr-11 text-sm font-700 text-brown-900 shadow-soft outline-none transition-colors placeholder:text-brown-300 focus:border-brown-900"
              />
              {query && (
                <button
                  onClick={() => updateQueryParam('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-brown-300 transition-colors hover:bg-cream-100 hover:text-brown-900"
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </label>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-cream-300 pb-4">
          <div className="flex items-center gap-2.5">
            <p className="text-sm font-700 text-brown-500">
              {!apiLoaded && <span className="text-brown-300">Loading... </span>}
              <span className="font-900 text-brown-900">{filtered.length}</span>
              <span> rental{filtered.length === 1 ? '' : 's'} available</span>
              {loadError && <span className="ml-2 text-red-600">{loadError}</span>}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="rounded-md px-2 py-1 text-xs font-800 text-brown-500 transition-colors hover:bg-cream-200 hover:text-brown-900"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-800 transition-colors lg:hidden ${
                hasActiveFilters
                  ? 'border-brown-900 bg-brown-900 text-white'
                  : 'border-cream-300 bg-white text-brown-700 hover:border-brown-900'
              }`}
            >
              <SlidersHorizontal size={15} />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-800">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="relative">
              <select
                value={sortBy}
                onChange={event => setSortBy(event.target.value as typeof sortBy)}
                className="h-10 appearance-none rounded-lg border border-cream-300 bg-white px-3 pr-9 text-sm font-800 text-brown-900 focus:border-brown-900 focus:outline-none"
              >
                <option value="relevance">Relevance</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-brown-300" />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="hidden lg:block">
            <div className="sticky top-24 border-r border-cream-300 pr-5">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-sm font-900 uppercase tracking-[0.08em] text-brown-900">Filters</h2>
                {activeFilterCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brown-900 px-1.5 text-[10px] font-800 text-white">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              {renderFilterSidebar()}
            </div>
          </div>

          <div className="min-w-0">
            {!apiLoaded ? (
              renderProductSkeletons()
            ) : filtered.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map(product => <ProductCard key={product.id} product={product} />)}
              </div>
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center border border-dashed border-cream-300 bg-cream-50 px-6 text-center">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-cream-100">
                  <Search size={24} className="text-brown-300" />
                </div>
                <h3 className="mb-1 text-lg font-900 text-brown-900">
                  {loadError ? 'Rentals could not be loaded' : 'No rentals found'}
                </h3>
                <p className="mb-5 max-w-xs text-sm leading-6 text-brown-500">
                  {loadError
                    ? 'Start the backend API and try again.'
                    : products.length === 0
                    ? 'Listings from the API will appear here.'
                    : 'Try adjusting your filters or search term.'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="rounded-lg border border-brown-900 bg-white px-4 py-2 text-sm font-800 text-brown-900 transition-colors hover:bg-cream-100"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 h-full w-full bg-brown-900/45 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close filters"
          />
          <div className="absolute right-0 top-0 h-full w-80 max-w-[86vw] overflow-y-auto bg-cream-50 px-5 py-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between border-b border-cream-300 pb-4">
              <h2 className="text-sm font-900 uppercase tracking-[0.08em] text-brown-900">Filters</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg p-2 text-brown-500 transition-colors hover:bg-cream-100 hover:text-brown-900"
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            </div>
            {renderFilterSidebar()}
            <button
              onClick={() => setSidebarOpen(false)}
              className="mt-6 h-11 w-full rounded-lg bg-brown-900 text-sm font-900 text-white transition-colors hover:bg-accent"
            >
              Show {filtered.length} result{filtered.length === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
