import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { Product } from '../types';
import { api } from '../lib/api';
import { mapApiProduct } from '../lib/mapProduct';
import heroImage from '../assets/rentx-hero-products.png';

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [apiLoaded, setApiLoaded] = useState(false);

  useEffect(() => {
    api.products.getAll()
      .then(res => setProducts((res.data as unknown[]).map(mapApiProduct)))
      .catch(() => setProducts([]))
      .finally(() => setApiLoaded(true));
  }, []);

  const featured = products[0];

  return (
    <div className="min-h-screen overflow-hidden bg-cream-100 text-brown-900">
      <section className="relative border-b border-cream-300/80">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(166,95,43,0.14),transparent_34%),radial-gradient(circle_at_88%_14%,rgba(102,60,33,0.12),transparent_32%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-[1.02fr_0.98fr] md:py-12 lg:px-8">
          <div className="flex flex-col justify-center">
            <span className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-cream-300 bg-white/75 px-4 py-2 text-xs font-800 text-brown-500 shadow-soft backdrop-blur">
              <Sparkles size={14} />
              Rent locally, without buying everything
            </span>

            <h1 className="max-w-3xl text-5xl font-900 leading-[0.98] text-brown-900 md:text-6xl lg:text-7xl">
              Find the thing you need for the days you need it.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-brown-500 md:text-lg">
              Rent cameras, bikes, tools, furniture and everyday gear from nearby people. Jump straight into the marketplace and browse what is available.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/search" className="btn-primary inline-flex h-14 items-center gap-2 px-6">
                Browse rentals
                <ArrowRight size={16} />
              </Link>
              <Link to="/list-product" className="btn-secondary inline-flex h-14 items-center gap-2 px-6">
                Post an item
              </Link>
            </div>

            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
              {[
                { icon: PackageCheck, label: 'Listings', value: apiLoaded ? `${products.length}+` : '...' },
                { icon: ShieldCheck, label: 'Safer flow', value: 'Chat first' },
                { icon: MapPin, label: 'Pickup', value: 'Nearby' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-[24px] border border-cream-300 bg-white/75 p-4 shadow-soft backdrop-blur">
                  <Icon size={18} className="mb-3 text-accent" />
                  <p className="text-lg font-900 text-brown-900">{value}</p>
                  <p className="mt-1 text-[11px] font-800 uppercase text-brown-300">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[460px] overflow-hidden rounded-[40px] border border-cream-300 bg-cream-50 shadow-card md:min-h-[610px]">
            <img src={heroImage} alt="Curated rental items" className="h-full w-full object-contain p-5 pb-36 md:p-8 md:pb-44" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brown-900/82 to-transparent p-5 pt-28">
              <div className="rounded-[28px] border border-white/25 bg-white/95 p-4 shadow-[0_20px_60px_rgba(23,35,29,0.22)] backdrop-blur">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-800 uppercase text-brown-300">Available now</p>
                    <p className="mt-1 text-lg font-900 text-brown-900">
                      {featured?.title ?? 'Weekend camera kit'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-900 text-brown-900">₹{(featured?.price ?? 899).toLocaleString('en-IN')}</p>
                    <p className="text-[11px] font-800 text-brown-300">per day</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-cream-300 pt-4 text-xs font-800 text-brown-500">
                  <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} /> Request before renting</span>
                  <span>{featured?.location?.name?.split(',')[0] ?? 'Near you'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:px-6 md:grid-cols-3 lg:px-8">
        {[
          { icon: PackageCheck, title: 'Browse', body: 'Move from landing into a focused marketplace page with filters and sorting.' },
          { icon: Camera, title: 'Inspect', body: 'Product-first cards show price, owner, location, condition and value at a glance.' },
          { icon: ShieldCheck, title: 'Request', body: 'Login only when you are ready to start a conversation with the owner.' },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-[30px] border border-cream-300 bg-white p-6 shadow-soft">
            <Icon size={22} className="mb-5 text-accent" />
            <h2 className="text-lg font-900 text-brown-900">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-brown-500">{body}</p>
          </div>
        ))}
      </section>

      <div className="px-4 pb-10 text-center">
        <Link to="/search" className="btn-primary inline-flex items-center gap-2">
          Browse all rentals
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
