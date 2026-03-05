import { motion } from "framer-motion";
import { Link } from "wouter";
import { useFacilities } from "@/hooks/use-facilities";
import { MapPin, Trophy, ArrowRight, Activity, Loader2, Utensils, Beer, Facebook } from "lucide-react";

export default function Home() {
  const { data: facilities, isLoading, error } = useFacilities();

  const getIcon = (type: string) => {
    switch (type) {
      case 'pizza': return <Utensils className="w-8 h-8 text-primary" />;
      case 'bar': return <Beer className="w-8 h-8 text-primary" />;
      case 'menu': return <Utensils className="w-8 h-8 text-primary" />;
      case 'vr': return <Activity className="w-8 h-8 text-primary" />;
      default: return <Activity className="w-8 h-8 text-primary" />;
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-[#0a0a0a]">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-600/10 via-background to-background -z-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-red-600/10 border border-red-600/20 text-red-500 mb-6">
              <Activity className="w-4 h-4" />
              <span className="text-sm font-bold tracking-widest uppercase">Zaramia Sport & Fun</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-extrabold text-white leading-[1.1] mb-6 tracking-tight uppercase">
              ZARAMIA <span className="text-red-600">PIZZA</span> <br/>
              SPORT <span className="text-red-600">&</span> FUN
            </h1>
            <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Miesto plné zážitkov pre všetkých. Vychutnajte si skvelú pizzu, športové aktivity a nezabudnuteľnú zábavu v srdci Rimavskej Soboty.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-10">
              <Link href="/menu">
                <button className="px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 transition-all shadow-[0_0_30px_rgba(220,38,38,0.3)]">
                  Zobraziť Menu
                </button>
              </Link>
              <a 
                href="https://www.facebook.com/pizzazaramia/?locale=sk_SK" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center space-x-2"
              >
                <Facebook className="w-5 h-5 text-[#1877F2]" />
                <span>Facebook</span>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Tiles Grid */}
      <section className="px-4 pb-24 max-w-7xl mx-auto w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-12 h-12 animate-spin text-red-600 mb-4" />
            <p className="font-medium">Načítavam arénu...</p>
          </div>
        ) : error ? (
          <div className="bg-red-600/10 border border-red-600/20 text-red-600 p-6 rounded-2xl text-center">
            <p className="font-bold">Chyba pri načítaní športovísk.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Custom Menu Tile */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Link 
                href="/menu"
                className="relative block group aspect-square rounded-[2rem] overflow-hidden border-2 border-white/5 bg-zinc-900 transition-all duration-500 hover:border-red-600/50 hover:shadow-[0_0_40px_-10px_rgba(220,38,38,0.3)] hover:-translate-y-2"
              >
                <img 
                  src="/images/zaramia_pizza1.jpg" 
                  alt="Menu"
                  className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                
                <div className="absolute inset-0 p-8 flex flex-col justify-end">
                  <div className="mb-4 bg-white/10 backdrop-blur-xl w-16 h-16 rounded-2xl flex items-center justify-center border border-white/10">
                    <Utensils className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-3xl font-display font-black text-white mb-2 tracking-tight uppercase">
                    🍕 Menu
                  </h3>
                  <div className="flex items-center justify-between">
                    <p className="text-gray-400 font-bold tracking-wide">ZOBRAZIŤ PONUKU</p>
                    <ArrowRight className="w-6 h-6 text-red-600 transform group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>
              </Link>
            </motion.div>

            {facilities?.filter(f => !f.courtNumber || f.courtNumber === '1').map((facility, index) => (
              <motion.div
                key={facility.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Link 
                  href={facility.isComingSoon ? "#" : (facility.sportType === 'badminton' ? `/facilities/${facility.id}` : "#")}
                  className={cn(
                    "relative block group aspect-square rounded-[2rem] overflow-hidden border-2 border-white/5 bg-zinc-900 transition-all duration-500",
                    !facility.isComingSoon && "hover:border-red-600/50 hover:shadow-[0_0_40px_-10px_rgba(220,38,38,0.3)] hover:-translate-y-2",
                    facility.isComingSoon && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <img 
                    src={facility.imageUrl} 
                    alt={facility.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  
                  <div className="absolute inset-0 p-8 flex flex-col justify-end">
                    <div className="mb-4 bg-white/10 backdrop-blur-xl w-16 h-16 rounded-2xl flex items-center justify-center border border-white/10">
                      {getIcon(facility.sportType)}
                    </div>
                    <h3 className="text-3xl font-display font-black text-white mb-2 tracking-tight uppercase">
                      {facility.name.split(' – ')[0]}
                    </h3>
                    <div className="flex items-center justify-between">
                      <p className="text-gray-400 font-bold tracking-wide">
                        {facility.isComingSoon ? "ČOSKORO" : (facility.pricePerHour > 0 ? `${(facility.pricePerHour/100).toFixed(2).replace('.', ',')} € / hod` : "ZOBRAZIŤ")}
                      </p>
                      {!facility.isComingSoon && <ArrowRight className="w-6 h-6 text-red-600 transform group-hover:translate-x-2 transition-transform" />}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
