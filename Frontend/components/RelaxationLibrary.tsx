
import React, { useState, useEffect } from 'react';
import { Play, Youtube, Loader2, Sparkles, Filter, Video } from 'lucide-react';
import { findRelaxationVideos } from '../services/aiService';

const VIDEO_CATEGORIES = [
  { id: 'guided meditation', label: 'Meditation' },
  { id: 'nature sounds 4k', label: 'Nature' },
  { id: 'asmr for sleep', label: 'ASMR' },
  { id: 'lofi hip hop focus', label: 'Lofi Beats' },
  { id: 'box breathing animation', label: 'Visual Breathing' }
];

const CATEGORY_THUMBNAILS: Record<string, string> = {
  'guided meditation': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80',
  'nature sounds 4k': 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=900&q=80',
  'asmr for sleep': 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=900&q=80',
  'lofi hip hop focus': 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80',
  'box breathing animation': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80'
};

type VideoItem = { title: string; uri: string; thumbnail: string };

const RelaxationLibrary: React.FC = () => {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState(VIDEO_CATEGORIES[0]);

  const CURATED_VIDEOS: Record<string, { title: string; uri: string }[]> = {
    'guided meditation': [
      { title: "10-Minute Meditation for Anxiety", uri: "https://www.youtube.com/watch?v=O-6f5wQXSu8" },
      { title: "Daily Calm | 10 Minute Mindfulness", uri: "https://www.youtube.com/watch?v=ZToicYcHIOU" },
      { title: "Great Meditation | 5 Minute Recap", uri: "https://www.youtube.com/watch?v=inpok4MKVLM" }
    ],
    'nature sounds 4k': [
      { title: "Relaxing River Sounds 4K", uri: "https://www.youtube.com/watch?v=IvjMgZO5xA8" },
      { title: "Tropical Rain & Thunder", uri: "https://www.youtube.com/watch?v=q76bMs-NwRk" },
      { title: "Deep Forest Birdsong", uri: "https://www.youtube.com/watch?v=Qm846KdZlpI" }
    ],
    'asmr for sleep': [
      { title: "Gentle Rain & Tapping ASMR", uri: "https://www.youtube.com/watch?v=tEwpf6YjXdQ" },
      { title: "Soft Spoken Sleep Helper", uri: "https://www.youtube.com/watch?v=1s58rW0_NtA" }
    ],
    'lofi hip hop focus': [
      { title: "Lofi Girl - Beats to Relax/Study To", uri: "https://www.youtube.com/watch?v=jfKfPfyJRdk" },
      { title: "Coffee Shop Ambience + Lofi", uri: "https://www.youtube.com/watch?v=-5KAN9_CzSA" }
    ],
    'box breathing animation': [
      { title: "Box Breathing Visual Guide", uri: "https://www.youtube.com/watch?v=tEmt1Znux58" },
      { title: "4-7-8 Breathing Technique", uri: "https://www.youtube.com/watch?v=UxBd_S-jZcQ" }
    ]
  };

  const fetchVideos = async (category: typeof VIDEO_CATEGORIES[0]) => {
    setLoading(true);
    try {
      const aiResults = await findRelaxationVideos(category.id);
      const curated = CURATED_VIDEOS[category.id] || [];

      // Combine AI results with curated, avoiding duplicates
      const seen = new Set(aiResults.map(v => v.uri));
      const filteredCurated = curated.filter(c => !seen.has(c.uri));

      const combined = [...aiResults, ...filteredCurated];
      const enriched = await Promise.all(
        combined.map(async (vid) => {
          const thumbnail = await getThumbnailUrl(vid.uri);
          return { ...vid, thumbnail };
        })
      );

      setVideos(enriched);
    } catch (e) {
      // Fallback entirely to curated if AI fails
      const curated = CURATED_VIDEOS[category.id] || [];
      const enriched = await Promise.all(
        curated.map(async (vid) => {
          const thumbnail = await getThumbnailUrl(vid.uri);
          return { ...vid, thumbnail };
        })
      );
      setVideos(enriched);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos(activeCategory);
  }, [activeCategory]);

  const getYoutubeId = (url: string) => {
    const match = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/i);
    return match ? match[1] : null;
  };

  const getYoutubeThumbnail = (url: string) => {
    const id = getYoutubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  };

  const getThumbnailUrl = async (url: string): Promise<string> => {
    // Try YouTube first
    const yt = getYoutubeThumbnail(url);
    if (yt) return yt;

    // Try oEmbed service
    try {
      const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.thumbnail_url) return data.thumbnail_url;
      }
    } catch (e) {
      console.warn('oEmbed fetch failed for', url, e);
    }

    // Fallback to category thumbnail
    return CATEGORY_THUMBNAILS[activeCategory.id] || 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80';
  };

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <Video size={12} /> Visual Therapy
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Relaxation Library</h2>
          <p className="text-slate-500 text-sm">AI-curated content to help you decompress and refocus.</p>
        </div>

        <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
          {VIDEO_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeCategory.id === cat.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                : 'text-slate-500 hover:text-indigo-600'
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center space-y-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin" />
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={20} />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Scanning the web for peace...</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="bg-white p-20 rounded-[3rem] border border-slate-100 text-center space-y-4">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
            <Youtube size={40} />
          </div>
          <p className="text-slate-500 font-bold">No videos found for this category. Try another one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {videos.map((vid, idx) => (
            <a
              key={idx}
              href={vid.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-indigo-100 transition-all flex flex-col h-full"
            >
              <div className="aspect-video bg-slate-100 relative overflow-hidden flex items-center justify-center">
                <img
                  src={vid.thumbnail}
                  alt={vid.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/10 transition-colors" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 transition-transform duration-300">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-indigo-600 shadow-2xl">
                    <Play size={24} fill="currentColor" />
                  </div>
                </div>
                <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white bg-black/40 px-2 py-1 rounded-full">
                  <Youtube size={12} /> YouTube
                </div>
              </div>
              <div className="p-6 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                    {vid.title}
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Source: YouTube</p>
                </div>
                <div className="pt-4 flex items-center text-xs font-black text-indigo-600 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Watch Video <Play size={12} fill="currentColor" />
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default RelaxationLibrary;
