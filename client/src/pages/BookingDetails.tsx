import { useParams, Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { sk } from "date-fns/locale";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, CalendarDays, Clock, CheckCircle2, AlertCircle, CreditCard, ShieldCheck, Loader2, XCircle } from "lucide-react";
import { useBooking } from "@/hooks/use-bookings";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { api, buildUrl } from "@shared/routes";

export default function BookingDetails() {
  const { id } = useParams<{ id: string }>();
  const [location] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const { data: booking, isLoading, refetch } = useBooking(Number(id));

  const [payPending, setPayPending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Detect return from Besteron (payment=return in URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "return" && id) {
      const transactionId = params.get("transactionId");
      verifyPayment(transactionId || undefined);
    }
  }, [id]);

  const verifyPayment = async (transactionId?: string) => {
    setVerifying(true);
    setPayError(null);
    try {
      const url = transactionId
        ? `/api/bookings/${id}/besteron-verify?transactionId=${encodeURIComponent(transactionId)}`
        : `/api/bookings/${id}/besteron-verify`;
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();

      if (data.status === "paid") {
        await refetch();
        queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
        toast({ title: "Platba úspešná", description: "Vaša rezervácia bola zaplatená. Tu je váš QR kód." });
        // Remove query param from URL without reload
        window.history.replaceState({}, "", `/bookings/${id}`);
      } else if (data.status === "failed") {
        setPayError("Platba zlyhala alebo bola zrušená. Skúste znova.");
        window.history.replaceState({}, "", `/bookings/${id}`);
      } else {
        setPayError("Platba ešte nebola spracovaná. Skúste znova o chvíľu.");
        window.history.replaceState({}, "", `/bookings/${id}`);
      }
    } catch (err) {
      setPayError("Chyba pri overovaní platby.");
    } finally {
      setVerifying(false);
    }
  };

  const handleBesteronPay = async () => {
    setPayPending(true);
    setPayError(null);
    try {
      const res = await fetch(`/api/bookings/${id}/besteron-pay`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setPayError(data.message || "Chyba pri vytváraní platby.");
        return;
      }
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        setPayError("Nepodarilo sa získať platobný odkaz.");
      }
    } catch (err) {
      setPayError("Chyba pri komunikácii so serverom.");
    } finally {
      setPayPending(false);
    }
  };

  if (authLoading || isLoading || verifying) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-red-600" />
        {verifying && <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Overujem platbu...</p>}
      </div>
    );
  }

  if (!isAuthenticated || !booking) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
        <AlertCircle className="w-16 h-16 text-red-600 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">
          {!isAuthenticated ? "Neprihlásený" : "Rezervácia sa nenašla"}
        </h2>
        <Link href="/bookings" className="text-red-600 font-bold hover:underline">Späť na rezervácie</Link>
      </div>
    );
  }

  const isPaid = booking.status === 'paid';
  const startDate = parseISO(booking.startTime as unknown as string);
  const endDate = parseISO(booking.endTime as unknown as string);
  const durationMin = differenceInMinutes(endDate, startDate);
  const totalAmount = (booking.totalPrice / 100).toFixed(2).replace('.', ',');

  return (
    <div className="flex-1 pb-24 bg-black">
      {/* Header image */}
      <div className="relative h-[28vh] w-full">
        <img
          src={booking.facility.imageUrl || "/images/badminton1.jpg"}
          alt={booking.facility.name}
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        <div className="absolute top-6 left-6">
          <Link href="/bookings" className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-xl flex items-center justify-center text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-14 relative z-10 space-y-6">
        {/* Status badge + title */}
        <div className="bg-zinc-900 border border-white/5 rounded-[2rem] p-8 shadow-2xl">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-widest mb-4 border ${isPaid ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
            {isPaid ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            {isPaid ? "Zaplatená" : "Rezervovaná"}
          </div>
          <h1 className="text-3xl font-display font-black text-white uppercase tracking-tight mb-1">{booking.facility.name}</h1>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Rezervácia #{String(booking.id).padStart(6, '0')}</p>
        </div>

        {/* Details */}
        <div className="bg-zinc-900 border border-white/5 rounded-[2rem] p-8 shadow-xl space-y-6">
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Detaily rezervácie</h3>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-black border border-white/5 flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-0.5">Dátum</p>
              <p className="text-white font-bold">{format(startDate, 'EEEE d. MMMM yyyy', { locale: sk })}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-black border border-white/5 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-0.5">Čas ({durationMin} min)</p>
              <p className="text-white font-bold">{format(startDate, 'HH:mm')} – {format(endDate, 'HH:mm')}</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <span className="text-gray-400 font-bold uppercase tracking-widest text-sm">Celková suma</span>
            <span className="text-3xl font-display font-black text-red-600">{totalAmount} €</span>
          </div>
        </div>

        {/* Payment / QR */}
        {isPaid ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border-2 border-green-500/20 rounded-[2rem] p-8 text-center shadow-2xl"
          >
            <h3 className="text-2xl font-display font-black text-white mb-1">Vstupný QR kód</h3>
            <p className="text-gray-400 text-sm mb-8">Predložte pri vstupe do areálu.</p>
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
            <div className="my-6 bg-black border border-yellow-500/30 rounded-2xl p-5 text-center">
              <p className="text-[11px] font-black uppercase tracking-widest text-yellow-500 mb-2">Kód na vstupnú klávesnicu</p>
              <div className="flex items-center justify-center gap-2">
                {['2','5','5','2','1'].map((digit, i) => (
                  <span key={i} data-testid={`digit-entry-code-${i}`}
                    className="w-11 h-14 rounded-xl bg-yellow-500/10 border-2 border-yellow-500/40 flex items-center justify-center text-2xl font-black text-yellow-400 shadow-[0_0_12px_-4px_rgba(234,179,8,0.4)]">
                    {digit}
                  </span>
                ))}
              </div>
              <div className="mt-3 space-y-1 text-[10px] text-gray-500 font-medium">
                <p>2× klepnite na klávesnicu → zadajte kód → stlačte ikonu zámku na otvorenie</p>
                <p>Za sebou nezabudnite zatvoriť dvere ručne.</p>
                <p>Pri odchode stlačte ikonu zámku na zatvorenie.</p>
              </div>
            </div>
            <div className="flex items-center justify-center text-green-400 text-sm font-black gap-2">
              <ShieldCheck className="w-4 h-4" />
              Overená a zabezpečená rezervácia
            </div>
          </motion.div>
        ) : (
          <div className="bg-zinc-900 border border-white/5 rounded-[2rem] p-8 shadow-2xl">
            <div className="w-14 h-14 bg-red-600/10 rounded-2xl flex items-center justify-center mb-6 border border-red-600/20">
              <CreditCard className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-2xl font-display font-black text-white mb-2">Zaplatiť rezerváciu</h3>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Rezervácia je potvrdená. Dokončite platbu cez Besteron — budete presmerovaní na bezpečnú platobnú stránku.
            </p>

            {payError && (
              <div className="flex items-start gap-3 bg-red-600/10 border border-red-600/20 rounded-2xl p-4 mb-6">
                <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm font-medium">{payError}</p>
              </div>
            )}

            {booking.besteronPaymentId && (
              <button
                onClick={() => verifyPayment()}
                disabled={verifying}
                className="w-full py-4 rounded-2xl font-black text-sm text-white mb-4 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 border border-white/10 bg-white/5"
              >
                {verifying ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Overujem platbu...</>
                ) : (
                  <><ShieldCheck className="w-5 h-5" /> Overiť stav platby</>
                )}
              </button>
            )}

            <button
              onClick={handleBesteronPay}
              disabled={payPending}
              data-testid="button-pay-besteron"
              className="w-full py-5 rounded-2xl font-black text-lg text-white hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              style={{background: '#cc1a1a', boxShadow: '0 0 40px -10px rgba(204,26,26,0.5)'}}
            >
              {payPending ? (
                <><Loader2 className="w-6 h-6 animate-spin" /> Presmerovávam...</>
              ) : (
                <><CreditCard className="w-6 h-6" /> ZAPLATIŤ {totalAmount} € cez Besteron</>
              )}
            </button>

            <p className="text-center text-xs text-gray-600 mt-4 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Platba je zabezpečená cez Besteron — overenú platobnú bránu
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
