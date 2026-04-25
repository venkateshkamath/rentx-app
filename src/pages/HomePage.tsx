import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import ProductCard from '../components/products/ProductCard';
import type { Category, Condition, Product } from '../types';
import { api } from '../lib/api';
import { mapApiProduct } from '../lib/mapProduct';

const CATEGORIES: Category[] = ['Electronics', 'Furniture', 'Clothing', 'Books', 'Sports', 'Appliances', 'Vehicles', 'Tools', 'Art', 'Other'];
const CONDITIONS: Condition[] = ['Like New', 'Good', 'Fair', 'Used'];

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [query, setQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<Condition[]>([]);
  const [selectedCityPlaceId, setSelectedCityPlaceId] = useState('all');
  const [maxPrice, setMaxPrice] = useState(Infinity);
  const [sortBy, setSortBy] = useState<'relevance' | 'price-asc' | 'price-desc' | 'rating'>('relevance');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    api.products.getAll()
      .then(res => {
        const mapped = (res.data as unknown[]).map(mapApiProduct);
        setProducts(mapped);
        setLoadError('');
        setApiLoaded(true);
      })
      .catch(() => {
        setProducts([]);
        setLoadError('Could not load rentals from the API.');
        setApiLoaded(true);
      });
  }, []);

  // Step is fixed at 50 so the slider always lands exactly on the max value
  const PRICE_STEP = 50;
  const priceSliderMax = useMemo(() => {
    if (products.length === 0) return 5000;
    const max = Math.max(...products.map(p => p.price));
    return Math.ceil(max / PRICE_STEP) * PRICE_STEP;
  }, [products]);

  // Derive unique cities from products
  const cities = useMemo(() => {
    const map = new Map<string, string>(); // placeId -> name
    for (const p of products) {
      if (p.location?.placeId && p.location.name) {
        map.set(p.location.placeId, p.location.name);
      }
    }
    return Array.from(map.entries()).map(([placeId, name]) => ({ placeId, name }));
  }, [products]);

  const toggleCategory = (cat: Category) => {
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
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
  };

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedConditions.length > 0 ||
    selectedCityPlaceId !== 'all' ||
    maxPrice < priceSliderMax ||
    !!query.trim();

  const filtered = useMemo(() => {
    let list = [...products];
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
  }, [maxPrice, query, selectedCategories, selectedCityPlaceId, selectedConditions, sortBy, products]);

  const renderFilterSidebar = () => (
    <aside className="w-full space-y-6">
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-brown-500">Category</h3>
        <div className="space-y-1">
          {CATEGORIES.map(category => (
            <label key={category} className="group flex cursor-pointer items-center gap-2.5 px-1">
              <input
                type="checkbox"
                checked={selectedCategories.includes(category)}
                onChange={() => toggleCategory(category)}
                className="h-4 w-4 rounded border-brown-300 accent-brown-600 focus:ring-brown-400"
              />
              <span className={`text-sm transition-colors ${selectedCategories.includes(category) ? 'font-medium text-brown-800' : 'text-brown-500 group-hover:text-brown-700'}`}>
                {category}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-brown-500">Condition</h3>
        <div className="space-y-1">
          {CONDITIONS.map(condition => (
            <label key={condition} className="group flex cursor-pointer items-center gap-2.5 px-1">
              <input
                type="checkbox"
                checked={selectedConditions.includes(condition)}
                onChange={() => toggleCondition(condition)}
                className="h-4 w-4 rounded border-brown-300 accent-brown-600"
              />
              <span className={`text-sm ${selectedConditions.includes(condition) ? 'font-medium text-brown-800' : 'text-brown-500 group-hover:text-brown-700'}`}>
                {condition}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-brown-500">City</h3>
        <div className="relative">
          <select
            value={selectedCityPlaceId}
            onChange={event => setSelectedCityPlaceId(event.target.value)}
            className="input-field appearance-none pr-8 text-sm"
          >
            <option value="all">All Cities</option>
            {cities.map(city => <option key={city.placeId} value={city.placeId}>{city.name}</option>)}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-brown-400" />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-brown-500">
          Max Price <span className="font-normal normal-case text-brown-400">(rent/day)</span>
        </h3>
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
          className="w-full accent-brown-600"
        />
        <div className="mt-1 flex justify-between text-xs text-brown-400">
          <span>₹0</span>
          <span className="font-medium text-brown-700">
            {maxPrice === Infinity ? 'Any' : `₹${maxPrice}`}
          </span>
          <span>₹{priceSliderMax.toLocaleString()}</span>
        </div>
      </div>

      {hasActiveFilters && (
        <button onClick={clearFilters} className="flex items-center gap-1.5 text-sm font-medium text-red-500 transition-colors hover:text-red-700">
          <X size={14} />
          Clear all filters
        </button>
      )}
    </aside>
  );

  const searchInput = (
    <div className="relative mx-auto max-w-xl">
      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-brown-400" />
      <input
        type="text"
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder="Search cameras, bikes, sofas, books..."
        className="w-full rounded-lg border-0 bg-white py-3.5 pl-11 pr-11 text-sm text-brown-800 shadow-card-hover placeholder-brown-300 focus:outline-none focus:ring-2 focus:ring-brown-300"
      />
      {query && (
        <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-brown-400 hover:text-brown-600">
          <X size={16} />
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-cream-100">
      <div className="bg-gradient-to-br from-brown-700 via-brown-600 to-brown-500 px-4 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-2 text-3xl font-semibold text-cream-100 md:text-4xl">Rent Anything Nearby</h1>
          <p className="mb-6 text-sm text-brown-200 md:text-base">
            Browse products freely. Login is needed only when you are ready to request an item.
          </p>
          {searchInput}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-brown-800 shadow-soft">All rentals</span>
            <span className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-cream-100">Verified owners</span>
            <span className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-cream-100">Chat after login</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-brown-600">
            {!apiLoaded && <span className="text-brown-400">Loading…  </span>}
            <span className="font-semibold text-brown-800">{filtered.length}</span> rental listing{filtered.length === 1 ? '' : 's'} found
            {loadError && <span className="ml-2 text-red-500">{loadError}</span>}
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-brown-200 bg-white px-3.5 py-2 text-sm font-medium text-brown-600 shadow-soft lg:hidden"
            >
              <SlidersHorizontal size={15} />
              Filters
            </button>

            <div className="relative">
              <select
                value={sortBy}
                onChange={event => setSortBy(event.target.value as typeof sortBy)}
                className="appearance-none rounded-lg border border-brown-200 bg-white px-3.5 py-2 pr-8 text-sm text-brown-700 shadow-soft focus:outline-none focus:ring-2 focus:ring-brown-300"
              >
                <option value="relevance">Relevance</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-brown-400" />
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-24 rounded-lg border border-cream-300 bg-white p-5 shadow-soft">
              <h2 className="mb-5 font-semibold text-brown-800">Filters</h2>
              {renderFilterSidebar()}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map(product => <ProductCard key={product.id} product={product} />)}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Search size={36} className="mb-4 text-brown-300" />
                <h3 className="mb-1 text-lg font-semibold text-brown-700">
                  {loadError ? 'Rentals could not be loaded' : 'No rentals found'}
                </h3>
                <p className="mb-4 text-sm text-brown-400">
                  {loadError ? 'Start the backend API and try again.' : products.length === 0 ? 'Listings from the API will appear here.' : 'Try adjusting your filters or search term.'}
                </p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-sm font-medium text-brown-600 underline underline-offset-2 hover:text-brown-800">
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 h-full w-full bg-brown-900/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} aria-label="Close filters" />
          <div className="absolute right-0 top-0 h-full w-80 overflow-y-auto bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-brown-800">Filters</h2>
              <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1.5 hover:bg-cream-200">
                <X size={18} className="text-brown-500" />
              </button>
            </div>
            {renderFilterSidebar()}
            <button onClick={() => setSidebarOpen(false)} className="btn-primary mt-6 w-full text-sm">
              Show {filtered.length} results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
