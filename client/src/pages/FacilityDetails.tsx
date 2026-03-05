import { useParams, useLocation } from "wouter";
import { useState, useMemo } from "react";
import { format, addHours, parse, differenceInHours, startOfToday } from "date-fns";
import { motion } from "framer-motion";
import { Calendar as CalendarIcon, Clock, MapPin, Info, ArrowLeft, Loader2 } from "lucide-react";
import { useFacility } from "@/hooks/use-facilities";
import { useCreateBooking } from "@/hooks/use-bookings";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

export default function FacilityDetails() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  
  const { data: facility, isLoading: isLoadingFacility } = useFacility(Number(id));
  const createBooking = useCreateBooking();

  // Form State
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState<string>("10:00");
  const [duration, setDuration] = useState<number>(1); // hours

  const timeOptions = useMemo(() => {
    const times = [];
    for (let i = 6; i <= 22; i++) {
      times.push(`${i.toString().padStart(2, "0")}:00`);
    }
    return times;
  }, []);

  const endTime = useMemo(() => {
    const start = parse(startTime, "HH:mm", new Date());
    return format(addHours(start, duration), "HH:mm");
  }, [startTime, duration]);

  const totalPrice = useMemo(() => {
    if (!facility) return 0;
    return (facility.pricePerHour / 100) * duration;
  }, [facility, duration]);

  const handleBook = async () => {
    if (!isAuthenticated) {
      window.location.href = "/api/login";
      return;
    }
    
    if (!facility) return;

    // Combine date and time to ISO strings
    const startDateTime = new Date(`${date}T${startTime}:00`).toISOString();
    const endDateTime = new Date(`${date}T${endTime}:00`).toISOString();

    createBooking.mutate({
      facilityId: facility.id,
      startTime: startDateTime,
      endTime: endDateTime,
    }, {
      onSuccess: (newBooking) => {
        setLocation(`/bookings/${newBooking.id}`);
      }
    });
  };

  if (isLoadingFacility) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <h2 className="text-2xl font-bold text-white mb-2">Facility Not Found</h2>
        <Link href="/" className="text-primary hover:underline">Return to Facilities</Link>
      </div>
    );
  }

  return (
    <div className="flex-1 pb-24">
      {/* Hero Header */}
      <div className="relative h-[40vh] md:h-[50vh] min-h-[300px] w-full bg-secondary">
        <img 
          src={facility.imageUrl || `https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1920&h=1080&fit=crop`} 
          alt={facility.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 max-w-7xl mx-auto">
          <Link href="/" className="inline-flex items-center text-white/70 hover:text-white mb-6 transition-colors font-medium">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Venues
          </Link>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <span className="bg-primary/20 text-primary border border-primary/30 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider">
              {facility.sportType}
            </span>
            <div className="flex items-center text-white/80 text-sm font-medium">
              <MapPin className="w-4 h-4 mr-1" />
              Premium Location
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-black text-white">{facility.name}</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Details Section */}
          <div className="lg:col-span-2 space-y-10">
            <section>
              <h2 className="flex items-center text-2xl font-display font-bold text-white mb-4">
                <Info className="w-6 h-6 mr-3 text-primary" />
                About the Arena
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {facility.description}
              </p>
            </section>

            <section className="bg-card border border-border p-8 rounded-3xl">
              <h3 className="text-xl font-bold text-white mb-6">Amenities & Rules</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['Professional Grade Surface', 'Floodlights Included', 'Locker Rooms Access', 'Equipment Rental Available'].map((item, i) => (
                  <div key={i} className="flex items-center text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-primary mr-3" />
                    {item}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Booking Widget */}
          <div className="lg:col-span-1">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="sticky top-28 bg-card border border-border rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex justify-between items-end mb-6 pb-6 border-b border-border">
                <div>
                  <p className="text-sm text-muted-foreground font-medium mb-1">Standard Rate</p>
                  <div className="flex items-baseline text-white">
                    <span className="text-4xl font-display font-black">${(facility.pricePerHour / 100).toFixed(2)}</span>
                    <span className="text-muted-foreground ml-1">/hr</span>
                  </div>
                </div>
              </div>

              <div className="space-y-5 mb-8">
                {/* Date Picker */}
                <div>
                  <label className="block text-sm font-bold text-white mb-2 flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-2 text-primary" /> Date
                  </label>
                  <input 
                    type="date"
                    min={format(startOfToday(), "yyyy-MM-dd")}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Start Time */}
                  <div>
                    <label className="block text-sm font-bold text-white mb-2 flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-primary" /> Start
                    </label>
                    <select
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none"
                    >
                      {timeOptions.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-sm font-bold text-white mb-2">Duration</label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none"
                    >
                      {[1, 1.5, 2, 3, 4].map(h => (
                        <option key={h} value={h}>{h} hr{h > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-background rounded-xl p-4 border border-border">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Session ends at</span>
                    <span className="font-bold text-white">{endTime}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="font-bold text-white">Total</span>
                    <span className="text-xl font-display font-black text-primary">${totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleBook}
                disabled={createBooking.isPending}
                className="w-full py-4 rounded-xl font-bold text-lg bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:transform-none transition-all duration-300"
              >
                {createBooking.isPending ? "Confirming..." : (isAuthenticated ? "Book Arena" : "Login to Book")}
              </button>
              
              {createBooking.isError && (
                <p className="mt-4 text-sm text-destructive text-center font-medium bg-destructive/10 py-2 rounded-lg">
                  {createBooking.error.message}
                </p>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
