import { useRef, useEffect, useState } from 'react';
import type { LocationData } from '../../types';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

/** Dynamically load the Google Maps JS API (once) */
let _loadPromise: Promise<void> | null = null;
function loadGoogleMapsScript(): Promise<void> {
  if (window.google?.maps?.places) return Promise.resolve();
  if (_loadPromise) return _loadPromise;

  _loadPromise = new Promise((resolve, reject) => {
    if (!GOOGLE_MAPS_API_KEY) {
      reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not set'));
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });

  return _loadPromise;
}

interface Props {
  value: LocationData | null;
  onChange: (location: LocationData) => void;
  placeholder?: string;
  className?: string;
  /** Restrict to a country (ISO 3166-1 alpha-2), e.g. "in" for India */
  country?: string;
}

export default function LocationAutocomplete({
  value,
  onChange,
  placeholder = 'Search city…',
  className = 'input-field',
  country = 'in',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [displayValue, setDisplayValue] = useState(value?.name ?? '');

  // Sync display text when parent value changes (e.g. form reset)
  useEffect(() => {
    queueMicrotask(() => setDisplayValue(value?.name ?? ''));
  }, [value]);

  useEffect(() => {
    if (!inputRef.current || autocompleteRef.current) return;

    loadGoogleMapsScript()
      .then(() => {
        if (!inputRef.current || autocompleteRef.current) return;

        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ['(cities)'],
          componentRestrictions: { country },
          fields: ['place_id', 'formatted_address', 'name', 'geometry'],
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (!place.place_id || !place.geometry?.location) return;

          const loc: LocationData = {
            placeId: place.place_id,
            name: place.formatted_address || place.name || '',
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };

          setDisplayValue(loc.name);
          onChange(loc);
        });

        autocompleteRef.current = autocomplete;
      })
      .catch((err) => console.error('Google Maps load error:', err));

    // Prevent form submit on Enter while autocomplete dropdown is open
    const el = inputRef.current;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
    };
    el.addEventListener('keydown', handleKeyDown);

    return () => {
      el.removeEventListener('keydown', handleKeyDown);
    };
  }, [country, onChange]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={displayValue}
      onChange={e => setDisplayValue(e.target.value)}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
    />
  );
}
