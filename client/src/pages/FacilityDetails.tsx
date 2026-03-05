import { useParams, useLocation, Link } from "wouter";
import { useState, useMemo } from "react";
import { format, addMinutes, parse, startOfToday } from "date-fns";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Check } from "lucide-react";
import { useFacilities } from "@/hooks/use-facilities";
import { useCreateBooking } from "@/hooks/use-bookings";
import { useAuth } from "@/hooks/use-auth";

const BRAND_GREEN = "#1e8c2a";
const BRAND_RED = "#cc1a1a";

export default function FacilityDetails() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  
  const { data: facilities, isLoading: isLoadingFacilities } = useFacilities();
  const createBooking = useCreateBooking();

  const currentFacility = facilities?.find(f => f.id === Number(id));
  const sportType = currentFacility?.sportType;
  
  const courts = useMemo(() => {
    return facilities?.filter(f => f.sportType === sportType) || [];
  }, [facilities, sportType]);

  const [selectedCourtId, setSelectedCourtId] = useState<number>(Number(id));
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState<string>("10:00");
  const [duration, setDuration] = useState<number>(60); // minutes

  const timeOptions = useMemo(() => {
    const times = [];
    for (let i = 8; i <= 21; i++) {
      times.push(`${i.toString().padStart(2, "0")}:00`);
      times.push(`${i.toString().padStart(2, "0")}:30`);
    }
    return times;
  }, []);

  const facility = courts.find(c => c.id === selectedCourtId);

  const endTime = useMemo(() => {
    const start = parse(startTime, "HH:mm", new Date());
    return format(addMinutes(start, duration), "HH:mm");
  }, [startTime, duration]);

  const totalPrice = useMemo(() => {
    if (!facility) return 0;
    return (facility.pricePerHour / 100) * (duration / 60);
  }, [facility, duration]);

  const handleBook = async () => {
    if (!isAuthenticated) {
      window.location.href = "/api/login";
      return;
    }
    
    if (!facility) return;

    const startDateTime = new Date(`${date}T${startTime}:00`).toISOString();
    const endDateTime = new Date(`${date}T${endTime}:00`).toISOString();

    createBooking.mutate({
      facilityId: facility.id,
      startTime: startDateTime,
      endTime: endDateTime,
      totalPrice: Math.round(totalPrice * 100),
    }, {
      onSuccess: (newBooking) => {
        setLocation(`/bookings/${newBooking.id}`);
      }
    });
  };

  if (isLoadingFacilities) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black">
        <Loader2 className="w-12 h-12 animate-spin text-red-600" />
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-black">
        <h2 className="text-2xl font-bold text-white mb-2">Športovisko sa nenašlo</h2>
        <Link href="/" className="text-red-600 hover:underline">Späť na úvod</Link>
      </div>
    );
  }

  return (
    <div className="flex-1 pb-24 bg-black">
      <div className="relative h-[30vh] w-full">
        <img 
          src={facility.imageUrl} 
          alt={facility.name}
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        <div className="absolute top-6 left-6">
          <Link href="/" className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-xl flex items-center justify-center text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-16 relative z-10">
        <div className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
          <div className="mb-8">
            <span className="font-black tracking-widest uppercase text-xs mb-2 block" style={{color: BRAND_GREEN}}>Rezervácia</span>
            <h1 className="text-4xl font-display font-black text-white uppercase tracking-tight mb-2">{sportType === 'badminton' ? 'Bedminton' : facility.name}</h1>
            <p className="text-gray-400">{facility.description}</p>
          </div>

          <div className="space-y-8">
            {/* Court Selection */}
            {sportType === 'badminton' && (
              <div>
                <label className="block text-sm font-black text-gray-500 uppercase tracking-widest mb-4">Vyberte kurt</label>
                <div className="grid grid-cols-2 gap-4">
                  {courts.map(court => (
                    <button
                      key={court.id}
                      onClick={() => setSelectedCourtId(court.id)}
                      className={cn(
                        "py-4 rounded-2xl font-bold border-2 transition-all flex items-center justify-center space-x-2",
                        selectedCourtId === court.id 
                          ? "text-white" 
                          : "bg-black border-white/5 text-gray-500 hover:border-white/20"
                      )}
                      style={selectedCourtId === court.id ? {background: BRAND_GREEN, borderColor: BRAND_GREEN} : {}}
                    >
                      {selectedCourtId === court.id && <Check className="w-5 h-5" style={{color: 'white'}} />}
                      <span>{court.courtNumber}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-black text-gray-500 uppercase tracking-widest mb-3">Dátum</label>
                <input 
                  type="date"
                  min={format(startOfToday(), "yyyy-MM-dd")}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-black border-2 border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none transition-all"
                  style={{colorScheme: 'dark'}}
                />
              </div>

              <div>
                <label className="block text-sm font-black text-gray-500 uppercase tracking-widest mb-3">Čas začiatku</label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-black border-2 border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none transition-all appearance-none"
                >
                  {timeOptions.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-black text-gray-500 uppercase tracking-widest mb-4">Dĺžka trvania</label>
              <div className="grid grid-cols-3 gap-4">
                {[60, 90, 120].map(m => (
                  <button
                    key={m}
                    onClick={() => setDuration(m)}
                    className={cn(
                      "py-4 rounded-2xl font-bold border-2 transition-all",
                      duration === m 
                        ? "text-white" 
                        : "bg-black border-white/5 text-gray-500 hover:border-white/20"
                    )}
                    style={duration === m ? {background: BRAND_RED, borderColor: BRAND_RED} : {}}
                  >
                    {m} min
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-black rounded-3xl p-8 border border-white/5">
              <div className="flex justify-between items-center mb-4 text-gray-400">
                <span className="font-bold">Koniec o</span>
                <span className="text-white font-black">{endTime}</span>
              </div>
              <div className="flex justify-between items-center pt-6 border-t border-white/5">
                <span className="text-gray-400 font-bold">Celková cena</span>
                <span className="text-4xl font-display font-black" style={{color: BRAND_GREEN}}>{totalPrice.toFixed(2).replace('.', ',')} €</span>
              </div>
            </div>

            <button
              onClick={handleBook}
              disabled={createBooking.isPending}
              className="w-full py-6 rounded-3xl font-black text-xl text-white hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              style={{background: BRAND_GREEN, boxShadow: `0 0 50px -10px ${BRAND_GREEN}70`}}
            >
              {createBooking.isPending ? "Spracúvam..." : (isAuthenticated ? "POTVRDIŤ REZERVÁCIU" : "PRIHLÁSIŤ SA A REZERVOVAŤ")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
