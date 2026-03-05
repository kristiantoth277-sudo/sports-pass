import { useBookings } from "@/hooks/use-bookings";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { CalendarDays, Clock, MapPin, ChevronRight, Loader2, QrCode } from "lucide-react";

export default function MyBookings() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: bookings, isLoading, error } = useBookings();

  if (authLoading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-6">
          <CalendarDays className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-3xl font-display font-bold text-white mb-4">Log in to view bookings</h2>
        <button 
          onClick={() => window.location.href = '/api/login'}
          className="px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors"
        >
          Log In
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
      <div className="mb-10">
        <h1 className="text-4xl font-display font-black text-white tracking-tight">My Bookings</h1>
        <p className="text-muted-foreground mt-2 text-lg">Manage your upcoming matches and view past sessions.</p>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
      ) : error ? (
        <div className="bg-destructive/10 text-destructive p-6 rounded-2xl border border-destructive/20 font-bold">
          Failed to load bookings.
        </div>
      ) : !bookings || bookings.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-16 text-center shadow-xl">
          <CalendarDays className="w-16 h-16 text-muted-foreground mx-auto mb-6 opacity-50" />
          <h3 className="text-2xl font-bold text-white mb-3">No bookings yet</h3>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">You haven't scheduled any sessions. Find an arena and start dominating.</p>
          <Link 
            href="/"
            className="inline-flex items-center px-8 py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
          >
            Browse Facilities
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {bookings.map((booking, i) => {
            const isPaid = booking.status === 'paid';
            const startDate = parseISO(booking.startTime as unknown as string);
            const endDate = parseISO(booking.endTime as unknown as string);

            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={booking.id}
              >
                <Link 
                  href={`/bookings/${booking.id}`}
                  className="flex flex-col md:flex-row bg-card border border-border hover:border-primary/50 rounded-2xl overflow-hidden group transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
                >
                  <div className="md:w-64 h-48 md:h-auto relative bg-secondary overflow-hidden shrink-0">
                    <img 
                      src={booking.facility.imageUrl || `https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&h=400&fit=crop`}
                      alt={booking.facility.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent md:bg-gradient-to-t" />
                    <div className="absolute bottom-4 left-4 md:top-4 md:left-4 md:bottom-auto">
                      <div className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border backdrop-blur-md ${
                        isPaid 
                          ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                          : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                      }`}>
                        {booking.status}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-2xl font-display font-bold text-white group-hover:text-primary transition-colors">
                          {booking.facility.name}
                        </h3>
                        <div className="flex items-center text-muted-foreground mt-1">
                          <MapPin className="w-4 h-4 mr-1" />
                          <span className="text-sm">{booking.facility.sportType} Arena</span>
                        </div>
                      </div>
                      
                      {isPaid && (
                        <div className="hidden sm:flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
                          <QrCode className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-auto">
                      <div className="bg-background rounded-xl p-3 border border-border">
                        <div className="flex items-center text-muted-foreground text-xs font-bold uppercase tracking-wider mb-1">
                          <CalendarDays className="w-3 h-3 mr-1" /> Date
                        </div>
                        <div className="text-white font-medium">{format(startDate, 'MMM do, yyyy')}</div>
                      </div>
                      
                      <div className="bg-background rounded-xl p-3 border border-border">
                        <div className="flex items-center text-muted-foreground text-xs font-bold uppercase tracking-wider mb-1">
                          <Clock className="w-3 h-3 mr-1" /> Time
                        </div>
                        <div className="text-white font-medium">
                          {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="hidden md:flex items-center justify-center p-8 border-l border-border bg-background/30 group-hover:bg-primary/5 transition-colors">
                    <ChevronRight className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
