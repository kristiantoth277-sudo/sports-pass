import { useParams, Link } from "wouter";
import { format, parseISO, differenceInHours } from "date-fns";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, MapPin, CalendarDays, Clock, CheckCircle2, AlertCircle, CreditCard, ShieldCheck } from "lucide-react";
import { useBooking, usePayBooking } from "@/hooks/use-bookings";
import { useAuth } from "@/hooks/use-auth";

export default function BookingDetails() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const { data: booking, isLoading } = useBooking(Number(id));
  const payBooking = usePayBooking();

  if (authLoading || isLoading) {
    return <div className="flex-1 flex items-center justify-center min-h-[60vh]"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!isAuthenticated || !booking) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">{!isAuthenticated ? "Unauthorized" : "Booking Not Found"}</h2>
        <Link href="/bookings" className="text-primary font-bold hover:underline">Return to Bookings</Link>
      </div>
    );
  }

  const isPaid = booking.status === 'paid';
  const startDate = parseISO(booking.startTime as unknown as string);
  const endDate = parseISO(booking.endTime as unknown as string);
  const duration = differenceInHours(endDate, startDate) || 1;
  const totalAmount = (booking.facility.pricePerHour / 100) * duration;

  const handlePayment = () => {
    payBooking.mutate(booking.id);
  };

  return (
    <div className="flex-1 py-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
      <Link href="/bookings" className="inline-flex items-center text-muted-foreground hover:text-white mb-8 transition-colors font-medium">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Bookings
      </Link>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Left Column: Details */}
        <div className="w-full lg:w-2/3 space-y-6">
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl">
            <div className="h-48 md:h-64 relative bg-secondary">
               <img 
                src={booking.facility.imageUrl || `https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&h=600&fit=crop`}
                alt={booking.facility.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider mb-4 border backdrop-blur-md ${
                  isPaid ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                }`}>
                  {isPaid ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Clock className="w-4 h-4 mr-2" />}
                  {booking.status}
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-black text-white">{booking.facility.name}</h1>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <h3 className="text-xl font-bold text-white mb-6 border-b border-border pb-4">Session Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start">
                  <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center mr-4 shrink-0">
                    <CalendarDays className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider mb-1">Date</p>
                    <p className="text-white font-medium text-lg">{format(startDate, 'EEEE, MMM do, yyyy')}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center mr-4 shrink-0">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider mb-1">Time ({duration} hr)</p>
                    <p className="text-white font-medium text-lg">{format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center mr-4 shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider mb-1">Location</p>
                    <p className="text-white font-medium text-lg">{booking.facility.sportType} Arena</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Action / QR */}
        <div className="w-full lg:w-1/3">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="sticky top-28"
          >
            {isPaid ? (
              <div className="bg-card border-2 border-primary/30 rounded-3xl p-8 text-center shadow-[0_0_40px_hsl(var(--primary)/0.1)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-cyan-300" />
                
                <h3 className="text-2xl font-display font-bold text-white mb-2">Access Pass</h3>
                <p className="text-muted-foreground text-sm mb-8">Scan this code at the facility entrance to unlock your arena.</p>
                
                <div className="bg-white p-6 rounded-2xl inline-block mx-auto mb-6 shadow-xl">
                  {booking.qrCodeData ? (
                    <QRCodeSVG 
                      value={booking.qrCodeData} 
                      size={200}
                      level="H"
                      includeMargin={false}
                    />
                  ) : (
                    <div className="w-[200px] h-[200px] bg-gray-100 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
                
                <div className="bg-background rounded-xl p-4 border border-border mb-2">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Booking ID</p>
                  <p className="font-mono text-white tracking-widest">{booking.id.toString().padStart(8, '0')}</p>
                </div>
                <div className="flex items-center justify-center text-green-400 text-sm font-bold mt-4">
                  <ShieldCheck className="w-4 h-4 mr-1.5" />
                  Verified & Secure
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-3xl p-8 shadow-2xl">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 border border-primary/20">
                  <CreditCard className="w-8 h-8 text-primary" />
                </div>
                
                <h3 className="text-2xl font-display font-bold text-white mb-2">Complete Payment</h3>
                <p className="text-muted-foreground mb-8">Your booking is reserved. Complete payment to get your access QR code.</p>
                
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Court rate ({duration} hr)</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Service fee</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-border">
                    <span className="font-bold text-white text-lg">Total</span>
                    <span className="text-3xl font-display font-black text-white">${totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handlePayment}
                  disabled={payBooking.isPending}
                  className="w-full py-4 rounded-xl font-bold text-lg bg-white text-black hover:bg-gray-200 transition-colors shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:transform-none flex justify-center items-center"
                >
                  {payBooking.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Simulate Payment"}
                </button>
                
                {payBooking.isError && (
                  <p className="mt-4 text-sm text-destructive text-center font-medium">
                    {payBooking.error.message}
                  </p>
                )}
                
                <p className="text-center text-xs text-muted-foreground mt-4 flex items-center justify-center">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Mocked Secure Checkout
                </p>
              </div>
            )}
          </motion.div>
        </div>

      </div>
    </div>
  );
}
