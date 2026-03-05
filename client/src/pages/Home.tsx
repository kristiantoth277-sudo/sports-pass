import { motion } from "framer-motion";
import { Link } from "wouter";
import { useFacilities } from "@/hooks/use-facilities";
import { MapPin, Trophy, ArrowRight, Activity, Loader2 } from "lucide-react";

export default function Home() {
  const { data: facilities, isLoading, error } = useFacilities();

  return (
    <div className="flex flex-col min-h-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background -z-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6">
              <Activity className="w-4 h-4" />
              <span className="text-sm font-bold tracking-wide uppercase">Premium Sports Venues</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-extrabold text-white leading-[1.1] mb-6">
              Find your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-300 text-glow">ARENA</span>.<br />
              Dominate the game.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed">
              Book top-tier sports facilities instantly. Secure your spot, grab your QR access code, and focus on what matters most — your performance.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Facilities Section */}
      <section className="py-20 bg-card/30 border-t border-border/50 flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl font-display font-bold text-white mb-2">Available Courts</h2>
              <p className="text-muted-foreground">Select a facility to view availability and book.</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="font-medium">Loading premium facilities...</p>
            </div>
          ) : error ? (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-6 rounded-2xl">
              <p className="font-bold">Error loading facilities.</p>
              <p className="text-sm opacity-80 mt-1">Please try again later.</p>
            </div>
          ) : facilities?.length === 0 ? (
            <div className="text-center py-20 bg-secondary/50 rounded-3xl border border-border">
              <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No facilities available</h3>
              <p className="text-muted-foreground">Check back later for new venues.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {facilities?.map((facility, index) => (
                <motion.div
                  key={facility.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Link 
                    href={`/facilities/${facility.id}`}
                    className="block group h-full bg-card rounded-3xl overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1"
                  >
                    <div className="relative h-64 overflow-hidden bg-secondary">
                      {/* Using unsplash placeholders dynamically if no image */}
                      <img 
                        src={facility.imageUrl || `https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=600&fit=crop`} 
                        alt={facility.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                      
                      <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                        <span className="text-sm font-bold text-white uppercase tracking-wider">{facility.sportType}</span>
                      </div>
                    </div>
                    
                    <div className="p-6 relative">
                      <div className="absolute -top-12 right-6 w-16 h-16 bg-primary rounded-2xl flex flex-col items-center justify-center text-primary-foreground shadow-lg shadow-primary/30 rotate-3 group-hover:rotate-6 transition-transform">
                        <span className="text-xs font-bold uppercase tracking-wider opacity-80 mb-[-4px]">/hr</span>
                        <span className="text-xl font-display font-black">${(facility.pricePerHour / 100).toFixed(0)}</span>
                      </div>
                      
                      <h3 className="text-2xl font-display font-bold text-white mb-2 group-hover:text-primary transition-colors pr-16">
                        {facility.name}
                      </h3>
                      <div className="flex items-center text-muted-foreground text-sm mb-4">
                        <MapPin className="w-4 h-4 mr-1.5" />
                        <span>Premium Venue</span>
                      </div>
                      
                      <p className="text-muted-foreground text-sm line-clamp-2 mb-6">
                        {facility.description}
                      </p>
                      
                      <div className="flex items-center text-primary font-bold text-sm">
                        <span>View & Book</span>
                        <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
