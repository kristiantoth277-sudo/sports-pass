import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ZoomIn, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";

const MENU_PAGES = [
  {
    src: "/images/menu_nealkoholicke.png",
    label: "Nealkoholické nápoje",
  },
];

export default function Menu() {
  const [zoomed, setZoomed] = useState<number | null>(null);
  const [page, setPage] = useState(0);

  const current = MENU_PAGES[page];
  const total = MENU_PAGES.length;

  return (
    <div className="flex-1 bg-black min-h-screen pb-20">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <Link href="/" className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-white hover:bg-zinc-800 transition-all">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-display font-black text-white uppercase tracking-tighter italic">
          PONUKA <span className="text-red-600">MENU</span>
        </h1>
        <div className="w-12" />
      </div>

      {/* Page tabs if multiple */}
      {total > 1 && (
        <div className="flex gap-2 justify-center px-4 mb-4">
          {MENU_PAGES.map((p, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                i === page
                  ? "bg-red-600 text-white"
                  : "bg-zinc-900 text-gray-400 hover:bg-zinc-800"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Menu Image */}
      <div className="max-w-2xl mx-auto px-4 mt-4">
        <motion.div
          key={page}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative group cursor-zoom-in rounded-[2rem] overflow-hidden border border-white/5 bg-zinc-900 shadow-2xl"
          onClick={() => setZoomed(page)}
          data-testid="menu-image-container"
        >
          <img
            src={current.src}
            alt={current.label}
            className="w-full h-auto block"
            data-testid="menu-image"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="bg-white/10 backdrop-blur-xl p-4 rounded-2xl border border-white/20">
              <ZoomIn className="w-8 h-8 text-white" />
            </div>
          </div>
        </motion.div>

        {/* Page label */}
        <p className="text-center text-gray-600 mt-5 font-bold uppercase tracking-widest text-xs">
          {current.label} · Ťuknite pre priblíženie
        </p>

        {/* Prev/Next arrows if multiple */}
        {total > 1 && (
          <div className="flex justify-center gap-4 mt-4">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-white disabled:opacity-30 hover:bg-zinc-800 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="flex items-center text-gray-500 text-sm font-bold">
              {page + 1} / {total}
            </span>
            <button
              onClick={() => setPage(p => Math.min(total - 1, p + 1))}
              disabled={page === total - 1}
              className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-white disabled:opacity-30 hover:bg-zinc-800 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {zoomed !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-2xl flex items-center justify-center p-2"
            onClick={() => setZoomed(null)}
          >
            <button
              className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all z-10"
              onClick={() => setZoomed(null)}
              data-testid="button-close-zoom"
            >
              <X className="w-6 h-6" />
            </button>
            <motion.img
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.92 }}
              src={MENU_PAGES[zoomed].src}
              alt={MENU_PAGES[zoomed].label}
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              onClick={e => e.stopPropagation()}
              data-testid="menu-image-zoomed"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
