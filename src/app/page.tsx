import { Play } from "lucide-react";

export default function Home() {
  const recentSearches = [
    { title: "I Love You Too Much", artist: "Diego Luna", image: "https://i.ytimg.com/vi/OpaUvHveN3Q/mqdefault.jpg" },
    { title: "Starboy", artist: "The Weeknd", image: "https://i.ytimg.com/vi/34Na4j8HLjc/mqdefault.jpg" },
    { title: "Blinding Lights", artist: "The Weeknd", image: "https://i.ytimg.com/vi/4NRXx6U8ABQ/mqdefault.jpg" },
    { title: "As It Was", artist: "Harry Styles", image: "https://i.ytimg.com/vi/H5v3kku4y6Q/mqdefault.jpg" },
    { title: "Levitating", artist: "Dua Lipa", image: "https://i.ytimg.com/vi/TUVcZfQe-Kw/mqdefault.jpg" },
    { title: "Peaches", artist: "Justin Bieber", image: "https://i.ytimg.com/vi/tQ0yjYUFKAE/mqdefault.jpg" },
  ];

  const recommendedMixes = [
    { title: "Chill Vibes", subtitle: "Relax and unwind", color: "from-blue-500 to-cyan-400" },
    { title: "Workout", subtitle: "Get pumped up", color: "from-red-500 to-orange-400" },
    { title: "Focus", subtitle: "Deep concentration", color: "from-purple-500 to-indigo-400" },
    { title: "Party", subtitle: "Upbeat hits", color: "from-pink-500 to-rose-400" },
  ];

  return (
    <div className="flex flex-col min-h-full pb-8">
      {/* Draggable Header Space */}
      <div className="h-12 w-full drag-region shrink-0" />

      <div className="px-8 no-drag">
        <h1 className="text-3xl font-bold text-white mb-6">Good evening</h1>

        {/* Recent Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {recentSearches.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-4 bg-white/5 hover:bg-white/10 transition-colors duration-200 rounded overflow-hidden group cursor-pointer press-scale"
            >
              <div className="w-16 h-16 shrink-0 relative bg-[var(--card-hover)]">
                {item.image && (
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-8 h-8 rounded-full bg-[var(--brand-gold)] flex items-center justify-center text-black shadow-lg">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>
              </div>
              <div className="flex flex-col truncate pr-4">
                <span className="font-semibold text-white truncate">{item.title}</span>
                <span className="text-sm text-[var(--text-muted)] truncate">{item.artist}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Recommended Section */}
        <h2 className="text-2xl font-bold text-white mb-6 hover-color w-max cursor-pointer">
          Recommended for you
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {recommendedMixes.map((mix, index) => (
            <div
              key={index}
              className="bg-[var(--card-bg)] hover:bg-[var(--card-hover)] p-4 rounded-lg transition-colors duration-200 cursor-pointer group press-scale flex flex-col gap-4"
            >
              <div className={`w-full aspect-square rounded-md bg-gradient-to-br ${mix.color} shadow-lg relative`}>
                {/* Play Button Overlay */}
                <div className="absolute bottom-2 right-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200 ease-out z-10">
                  <button className="w-12 h-12 rounded-full bg-[var(--brand-gold)] text-black flex items-center justify-center shadow-xl hover:scale-105 transition-transform">
                    <Play className="w-6 h-6 fill-current ml-1" />
                  </button>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-white">{mix.title}</span>
                <span className="text-sm text-[var(--text-muted)] mt-1 line-clamp-2">
                  {mix.subtitle}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
