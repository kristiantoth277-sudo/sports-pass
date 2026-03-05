import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ZoomIn, X } from "lucide-react";
import { Link } from "wouter";

export default function Menu() {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <div className="flex-1 bg-black min-h-screen pb-20">
      {/* Header */}
      <div className="p-6 flex items-center justify-between">
        <Link href="/" className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-white hover:bg-zinc-800 transition-all">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-display font-black text-white uppercase tracking-tighter italic">
          PONUKA <span className="text-red-600">MENU</span>
        </h1>
        <div className="w-12" /> {/* Spacer */}
      </div>

      {/* Menu Image Container */}
      <div className="max-w-4xl mx-auto px-4 mt-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative group cursor-zoom-in rounded-[2.5rem] overflow-hidden border border-white/5 bg-zinc-900 shadow-2xl"
          onClick={() => setIsZoomed(true)}
        >
          <img 
            src="/images/zaramia_pizza2.jpg" 
            alt="Zaramia Menu"
            className="w-full h-auto block"
            onError={(e) => {
              // Fallback if image doesn't exist
              const target = e.target as HTMLImageElement;
              target.src = "/menu.jpg";
            }}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="bg-white/10 backdrop-blur-xl p-4 rounded-2xl border border-white/20">
              <ZoomIn className="w-8 h-8 text-white" />
            </div>
          </div>
        </motion.div>
        
        <p className="text-center text-gray-500 mt-8 font-bold uppercase tracking-widest text-xs">
          Ťuknite na obrázok pre priblíženie
        </p>
      </div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {isZoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4"
            onClick={() => setIsZoomed(false)}
          >
            <button className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all">
              <X className="w-6 h-6" />
            </button>
            <motion.img 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src="/images/zaramia_pizza2.jpg" 
              alt="Zaramia Menu Fullscreen"
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/menu.jpg";
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
