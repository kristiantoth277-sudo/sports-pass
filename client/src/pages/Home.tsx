import { motion } from "framer-motion";
import { Link } from "wouter";
import { useFacilities } from "@/hooks/use-facilities";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Activity, Loader2, Utensils, Beer, Facebook, Instagram, AlertCircle, MapPin, Phone } from "lucide-react";

const BRAND_GREEN = "#1e8c2a";
const BRAND_RED = "#cc1a1a";

export default function Home() {
  const { data: facilities, isLoading, error } = useFacilities();
  const { data: badmintonAvailability } = useQuery<{ available: boolean }>({
    queryKey: ["/api/facilities/badminton-available"],
    refetchInterval: 60000,
  });
  const badmintonAvailable = badmintonAvailability?.available ?? true;

  const getIcon = (type: string) => {
    switch (type) {
      case 'pizza': return <Utensils className="w-8 h-8" style={{color: BRAND_RED}} />;
      case 'bar': return <Beer className="w-8 h-8" style={{color: BRAND_GREEN}} />;
      case 'menu': return <Utensils className="w-8 h-8" style={{color: BRAND_RED}} />;
      case 'vr': return <Activity className="w-8 h-8" style={{color: BRAND_GREEN}} />;
      default: return <Activity className="w-8 h-8" style={{color: BRAND_GREEN}} />;
    }
  };

  const getTileAccent = (sportType: string, isComingSoon: boolean) => {
    if (isComingSoon) return { border: 'rgba(255,255,255,0.05)', shadow: 'none', arrow: '#555' };
    if (sportType === 'badminton') return { border: BRAND_GREEN, shadow: 'rgba(30,140,42,0.3)', arrow: BRAND_GREEN };
    return { border: BRAND_RED, shadow: 'rgba(204,26,26,0.3)', arrow: BRAND_RED };
  };

  return (
    <div className="flex flex-col min-h-full bg-[#0a0a0a]">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-10 pb-16">
        {/* Italian tricolor gradient background */}
        <div className="absolute inset-0 -z-10" style={{
          background: `radial-gradient(ellipse at top left, ${BRAND_GREEN}18 0%, transparent 50%),
                       radial-gradient(ellipse at top right, ${BRAND_RED}18 0%, transparent 50%)`
        }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center text-center"
          >
            {/* Big Logo */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.7, type: "spring" }}
              className="mb-6"
            >
              <img
                src="/images/zaramia_logo_full.jpg"
                alt="ZaraMia"
                className="w-48 h-48 sm:w-56 sm:h-56 object-cover rounded-full shadow-2xl"
                style={{ boxShadow: `0 0 60px -10px ${BRAND_GREEN}60, 0 0 80px -20px ${BRAND_RED}40` }}
              />
            </motion.div>

            {/* Italian tricolor stripe */}
            <div className="flex h-1.5 w-48 rounded-full overflow-hidden mb-6">
              <div className="flex-1" style={{background: BRAND_GREEN}} />
              <div className="flex-1 bg-white" />
              <div className="flex-1" style={{background: BRAND_RED}} />
            </div>

            <h1 className="text-5xl md:text-7xl font-display font-extrabold text-white leading-[1.1] mb-4 tracking-tight italic">
              Zara<span style={{color: BRAND_RED}}>Mia</span>
            </h1>
            <p className="text-base md:text-lg font-black uppercase tracking-[0.25em] mb-4" style={{color: BRAND_GREEN}}>
              pizza, sport &amp; fun
            </p>
            <p className="text-base md:text-lg text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed">
              Miesto plné zážitkov pre všetkých. Pizza, bedminton, bowling, VR a zábava v srdci Rimavskej Soboty.
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-4">
              <Link href="/menu">
                <button
                  className="px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all"
                  style={{ background: BRAND_RED, boxShadow: `0 0 30px -5px ${BRAND_RED}60` }}
                >
                  🍕 Zobraziť Menu
                </button>
              </Link>
              <a
                href="https://www.facebook.com/pizzazaramia/?locale=sk_SK"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center gap-2"
              >
                <Facebook className="w-5 h-5 text-[#1877F2]" />
                <span>Facebook</span>
              </a>
              <a
                href="https://www.instagram.com/zaramiapizzasportfun/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center gap-2"
              >
                <Instagram className="w-5 h-5 text-[#E1306C]" />
                <span>Instagram</span>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Tiles Grid */}
      <section className="px-4 pb-24 max-w-7xl mx-auto w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-12 h-12 animate-spin mb-4" style={{color: BRAND_GREEN}} />
            <p className="font-bold uppercase tracking-widest text-sm">Načítavam...</p>
          </div>
        ) : error ? (
          <div className="border rounded-2xl p-6 text-center" style={{borderColor: `${BRAND_RED}40`, color: BRAND_RED}}>
            <p className="font-bold">Chyba pri načítaní športovísk.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Menu Tile */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Link
                href="/menu"
                className="relative block group aspect-square rounded-[2rem] overflow-hidden bg-zinc-900 transition-all duration-500 hover:-translate-y-2"
                style={{ border: `2px solid rgba(204,26,26,0.15)` }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = `${BRAND_RED}80`;
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 0 40px -10px ${BRAND_RED}50`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = `rgba(204,26,26,0.15)`;
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                <img
                  src="/images/pizza.jpg"
                  alt="Menu"
                  className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute inset-0 p-8 flex flex-col justify-end">
                  <div className="mb-4 bg-white/10 backdrop-blur-xl w-16 h-16 rounded-2xl flex items-center justify-center border border-white/10">
                    <Utensils className="w-8 h-8" style={{color: BRAND_RED}} />
                  </div>
                  <h3 className="text-3xl font-display font-black text-white mb-2 tracking-tight uppercase">🍕 Menu</h3>
                  <div className="flex items-center justify-between">
                    <p className="text-gray-400 font-bold tracking-wide">ZOBRAZIŤ PONUKU</p>
                    <ArrowRight className="w-6 h-6 transform group-hover:translate-x-2 transition-transform" style={{color: BRAND_RED}} />
                  </div>
                </div>
              </Link>
            </motion.div>

            {facilities?.filter(f => !f.courtNumber || f.courtNumber === '1').map((facility, index) => {
              const needsBadminton = facility.sportType === 'bowling' || facility.sportType === 'table_tennis';
              const isBlocked = needsBadminton && !badmintonAvailable;
              const effectivelyUnavailable = !!facility.isComingSoon || isBlocked;
              const accent = getTileAccent(facility.sportType, effectivelyUnavailable);
              const facilityHref = effectivelyUnavailable ? "#" : `/facilities/${facility.id}`;
              return (
                <motion.div
                  key={facility.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: (index + 1) * 0.08 }}
                >
                  <Link
                    href={facilityHref}
                    className={cn(
                      "relative block group aspect-square rounded-[2rem] overflow-hidden bg-zinc-900 transition-all duration-500",
                      !effectivelyUnavailable && "hover:-translate-y-2",
                      effectivelyUnavailable && "opacity-60 cursor-not-allowed"
                    )}
                    style={{ border: `2px solid rgba(255,255,255,0.05)` }}
                    onMouseEnter={e => {
                      if (!effectivelyUnavailable) {
                        (e.currentTarget as HTMLElement).style.borderColor = `${accent.border}80`;
                        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 40px -10px ${accent.shadow}`;
                      }
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = `rgba(255,255,255,0.05)`;
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    }}
                  >
                    <img
                      src={facility.imageUrl || ''}
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
                        <p className="text-gray-400 font-bold tracking-wide text-sm">
                          {facility.isComingSoon
                            ? "ČOSKORO"
                            : isBlocked
                              ? "LEN PRI VOĽNOM KURTE"
                              : (facility.pricePerHour > 0 ? `${(facility.pricePerHour/100).toFixed(2).replace('.', ',')} € / hod` : "ZOBRAZIŤ")}
                        </p>
                        {!effectivelyUnavailable && (
                          <ArrowRight className="w-6 h-6 transform group-hover:translate-x-2 transition-transform" style={{color: accent.arrow}} />
                        )}
                        {isBlocked && (
                          <AlertCircle className="w-5 h-5 text-yellow-500" />
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Social Media Section */}
      <section className="px-4 pb-28 max-w-2xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <p className="text-center text-xs font-black uppercase tracking-[0.25em] text-gray-600 mb-5">Sledujte nás</p>
          <div className="grid grid-cols-2 gap-4">
            {/* Instagram */}
            <a
              href="https://www.instagram.com/zaramiapizzasportfun/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center justify-center gap-3 py-7 rounded-[1.75rem] border border-white/5 bg-zinc-900 hover:-translate-y-1 transition-all duration-300"
              style={{background: 'linear-gradient(135deg, rgba(131,58,180,0.08), rgba(225,48,108,0.08), rgba(253,203,110,0.08))'}}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(225,48,108,0.3)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)'}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, #833ab4, #e1306c, #fd9e52)'}}>
                <Instagram className="w-7 h-7 text-white" />
              </div>
              <div className="text-center">
                <p className="text-white font-black text-sm">@zaramiapizzasportfun</p>
                <p className="text-gray-600 text-xs font-bold mt-0.5 uppercase tracking-widest">Instagram</p>
              </div>
            </a>

            {/* Facebook */}
            <a
              href="https://www.facebook.com/pizzazaramia/?locale=sk_SK"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center justify-center gap-3 py-7 rounded-[1.75rem] border border-white/5 bg-zinc-900 hover:-translate-y-1 transition-all duration-300"
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(24,119,242,0.3)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)'}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#1877F2]">
                <Facebook className="w-7 h-7 text-white" />
              </div>
              <div className="text-center">
                <p className="text-white font-black text-sm">Pizza Zaramia</p>
                <p className="text-gray-600 text-xs font-bold mt-0.5 uppercase tracking-widest">Facebook</p>
              </div>
            </a>
          </div>
        </motion.div>
      </section>

      {/* Contact & Location */}
      <section className="max-w-2xl mx-auto px-4 pb-28 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <p className="text-center text-xs font-black uppercase tracking-[0.25em] text-gray-600 mb-5">Kde nás nájdete</p>
          <div className="rounded-[1.75rem] border border-white/5 bg-zinc-900 overflow-hidden">
            {/* Google Maps embed */}
            <a
              href="https://maps.app.goo.gl/gTjKCdXJRi6zmk6g9"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
              data-testid="link-map"
            >
              <iframe
                title="Zaramia mapa"
                src="https://maps.google.com/maps?q=48.3859279,20.0152241&output=embed&z=18"
                width="100%"
                height="220"
                style={{ border: 0, display: 'block' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </a>
            {/* Contact details */}
            <div className="p-5 flex flex-col gap-4">
              <a
                href="tel:+421911293627"
                className="flex items-center gap-4 group"
                data-testid="link-phone"
              >
                <div className="w-11 h-11 rounded-xl bg-red-600/10 flex items-center justify-center shrink-0 group-hover:bg-red-600/20 transition-colors">
                  <Phone className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-white font-black text-base">0911 293 627</p>
                  <p className="text-gray-600 text-xs font-bold uppercase tracking-widest">Zavolajte nám</p>
                </div>
              </a>
              <a
                href="https://maps.app.goo.gl/gTjKCdXJRi6zmk6g9"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 group"
                data-testid="link-address"
              >
                <div className="w-11 h-11 rounded-xl bg-red-600/10 flex items-center justify-center shrink-0 group-hover:bg-red-600/20 transition-colors">
                  <MapPin className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-white font-black text-base">Cukrovárska 5246, 28/A</p>
                  <p className="text-gray-400 text-sm font-bold">97901 Rimavská Sobota</p>
                  <p className="text-gray-600 text-xs mt-0.5">Za ekonomickou školou, oproti IK catering</p>
                </div>
              </a>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
