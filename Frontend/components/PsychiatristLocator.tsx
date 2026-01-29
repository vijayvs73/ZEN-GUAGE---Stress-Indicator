
import React, { useState, useEffect } from 'react';
import { MapPin, ExternalLink, Loader2, AlertCircle, Search, Navigation } from 'lucide-react';
import { findNearbySupport } from '../services/aiService';

const PsychiatristLocator: React.FC = () => {
  const [locations, setLocations] = useState<{ title: string, uri: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = async () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        try {
          const results = await findNearbySupport(coords);
          setLocations(results);
          if (results.length === 0) {
            setError("No mental health specialists found in your immediate area.");
          }
        } catch (err) {
          setError("Failed to fetch nearby support. Please check your connection.");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError("Location access denied. Please enable location permissions to find nearby support.");
        setLoading(false);
      },
      { timeout: 10000 }
    );
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-8 animate-in fade-in duration-500 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <Navigation size={12} /> Local Support
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Psychiatrist Locator</h2>
          <p className="text-slate-500 text-sm max-w-lg">
            Finding professional support is a sign of strength. We've mapped out specialized care providers near your current location.
          </p>
        </div>
        <button
          onClick={fetchLocations}
          disabled={loading}
          className="flex items-center gap-2 bg-white border border-slate-200 px-6 py-3 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-50 shadow-sm"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Refresh Search
        </button>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-red-500 animate-spin" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Searching map for specialists...</p>
        </div>
      ) : error ? (
        <div className="bg-white border border-slate-100 p-12 rounded-[2.5rem] flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500">
            <AlertCircle size={32} />
          </div>
          <p className="text-slate-900 font-bold">{error}</p>
          <button
            onClick={fetchLocations}
            className="text-indigo-600 font-bold text-sm hover:underline"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {locations.map((loc, idx) => (
            <div
              key={idx}
              className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-red-100/30 transition-all flex flex-col gap-4 relative"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 flex-shrink-0 group-hover:scale-110 transition-transform">
                  <MapPin size={24} />
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="font-bold text-slate-900 leading-tight pr-4">{loc.title}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available Provider</p>
                </div>
              </div>

              <a
                href={loc.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full mt-2 py-3.5 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center gap-2 font-black text-sm hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-[0.98]"
              >
                <Navigation size={16} />
                Get Directions
                <ExternalLink size={14} className="opacity-50" />
              </a>
            </div>
          ))}
        </div>
      )}

      {!loading && locations.length > 0 && (
        <div className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-center">
          <p className="text-[11px] text-slate-500 font-medium">
            ZenGauge is a wellness awareness tool. If you are experiencing a crisis, please call emergency services or a mental health hotline immediately.
          </p>
        </div>
      )}
    </div>
  );
};

export default PsychiatristLocator;
