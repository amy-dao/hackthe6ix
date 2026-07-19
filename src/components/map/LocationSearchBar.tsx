import { useState, type FormEvent } from 'react';
import type { Palette } from '../../palette';
import { searchPlace } from '../../lib/geocode';

interface LocationSearchBarProps {
  palette: Palette;
  onLocate: (lat: number, lng: number) => void;
}

export default function LocationSearchBar({ palette, onLocate }: LocationSearchBarProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    try {
      const results = await searchPlace(trimmed);
      if (!results.length) {
        setError('No matching location found.');
        return;
      }
      onLocate(results[0].lat, results[0].lng);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Location search failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: 'absolute', top: 10, left: 10, right: 10, zIndex: 1000 }}>
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          gap: 6,
          background: palette.card,
          borderRadius: 10,
          padding: 6,
          boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Where's your farm? Search a city or address…"
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 13,
            color: palette.dark,
            padding: '6px 8px',
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            border: 'none',
            borderRadius: 8,
            padding: '6px 14px',
            background: palette.dark,
            color: palette.offwhite,
            fontWeight: 700,
            fontSize: 12.5,
            cursor: loading ? 'wait' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? '…' : 'Go'}
        </button>
      </form>
      {error && (
        <div
          style={{
            marginTop: 6,
            fontSize: 11.5,
            fontWeight: 600,
            color: '#C0392B',
            background: 'rgba(192,57,43,0.1)',
            borderRadius: 8,
            padding: '6px 10px',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
