import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, subDays, parseISO } from "date-fns";
import { sk } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, Loader2, CalendarDays } from "lucide-react";
import { useFacilities } from "@/hooks/use-facilities";

const BRAND_GREEN = "#1e8c2a";
const BRAND_RED = "#cc1a1a";

const SPORT_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  badminton: { bg: "rgba(30,140,42,0.15)", border: BRAND_GREEN, label: "Badminton" },
  bowling:   { bg: "rgba(204,26,26,0.15)", border: BRAND_RED, label: "Bowling" },
  table_tennis: { bg: "rgba(59,130,246,0.15)", border: "#3b82f6", label: "Stolný tenis" },
  vr:        { bg: "rgba(139,92,246,0.15)", border: "#8b5cf6", label: "VR" },
};

const HOUR_START = 8;
const HOUR_END = 22;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

interface ScheduleEntry {
  id: number;
  facilityId: number;
  facilityName: string;
  sportType: string;
  startTime: string;
  endTime: string;
  status: string;
}

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: facilities } = useFacilities();
  const { data: bookings, isLoading } = useQuery<ScheduleEntry[]>({
    queryKey: ["/api/schedule", dateStr],
    queryFn: async () => {
      const res = await fetch(`/api/schedule?date=${dateStr}`);
      return res.json();
    },
  });

  const activeFacilities = (facilities || []).filter(f => !f.isComingSoon && f.sportType !== "pizza" && f.sportType !== "bar");

  function getBookingsForFacility(facilityId: number) {
    return (bookings || []).filter(b => b.facilityId === facilityId);
  }

  function timeToPercent(timeStr: string) {
    const d = parseISO(timeStr);
    const h = d.getHours() + d.getMinutes() / 60;
    return ((h - HOUR_START) / (HOUR_END - HOUR_START)) * 100;
  }

  function durationPercent(startStr: string, endStr: string) {
    const s = parseISO(startStr);
    const e = parseISO(endStr);
    const mins = (e.getTime() - s.getTime()) / 60000;
    return (mins / 60 / (HOUR_END - HOUR_START)) * 100;
  }

  const isToday = format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  return (
    <div className="flex flex-col min-h-full bg-[#0a0a0a] text-white pb-24">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-display font-black uppercase tracking-tighter italic">
              Rezervačný <span style={{ color: BRAND_RED }}>Prehľad</span>
            </h1>
            <p className="text-gray-500 font-bold text-sm mt-1 uppercase tracking-widest">
              Obsadenosť kurtov a dráh
            </p>
          </div>

          {/* Date navigation */}
          <div className="flex items-center gap-3 bg-zinc-900 border border-white/5 rounded-2xl p-2">
            <button
              onClick={() => setSelectedDate(d => subDays(d, 1))}
              className="p-2 rounded-xl hover:bg-white/5 transition-all"
              data-testid="button-prev-day"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center min-w-[160px]">
              <p className="font-black text-white text-sm uppercase tracking-widest">
                {isToday ? "Dnes" : format(selectedDate, "EEEE", { locale: sk })}
              </p>
              <p className="text-gray-400 text-xs font-bold">
                {format(selectedDate, "d. MMMM yyyy", { locale: sk })}
              </p>
            </div>
            <button
              onClick={() => setSelectedDate(d => addDays(d, 1))}
              className="p-2 rounded-xl hover:bg-white/5 transition-all"
              data-testid="button-next-day"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-8">
          {Object.entries(SPORT_COLORS).map(([type, c]) => (
            <div key={type} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: c.bg, border: `1px solid ${c.border}40` }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.border }} />
              <span style={{ color: c.border }}>{c.label}</span>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-500">
            <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: BRAND_GREEN }} />
            <p className="font-bold uppercase tracking-widest text-sm">Načítavam...</p>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-white/5 rounded-[2rem] overflow-hidden">
            {/* Time header */}
            <div className="flex border-b border-white/5">
              <div className="w-40 shrink-0 p-4 border-r border-white/5 flex items-center">
                <Clock className="w-4 h-4 text-gray-600 mr-2" />
                <span className="text-gray-600 text-xs font-bold uppercase tracking-widest">Zariadenie</span>
              </div>
              <div className="flex-1 relative h-12">
                <div className="flex h-full">
                  {HOURS.map(h => (
                    <div key={h} className="flex-1 border-r border-white/5 flex items-end pb-1 justify-center">
                      <span className="text-gray-600 text-xs font-bold">{h}:00</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Facility rows */}
            {activeFacilities.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-gray-600">
                <CalendarDays className="w-8 h-8 mr-3" />
                <p className="font-bold">Žiadne aktívne zariadenia</p>
              </div>
            ) : (
              activeFacilities.map((facility, idx) => {
                const color = SPORT_COLORS[facility.sportType] || SPORT_COLORS.badminton;
                const facilityBookings = getBookingsForFacility(facility.id);
                return (
                  <div
                    key={facility.id}
                    className="flex"
                    style={{ borderBottom: idx < activeFacilities.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                    data-testid={`schedule-row-${facility.id}`}
                  >
                    {/* Facility label */}
                    <div className="w-40 shrink-0 p-4 border-r border-white/5 flex flex-col justify-center">
                      <p className="font-black text-white text-sm leading-tight">{facility.name.split(" – ")[0]}</p>
                      <p className="text-xs font-bold mt-0.5" style={{ color: color.border }}>
                        {facility.name.split(" – ")[1] || ""}
                      </p>
                    </div>

                    {/* Timeline */}
                    <div className="flex-1 relative h-16 overflow-hidden">
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex">
                        {HOURS.map(h => (
                          <div key={h} className="flex-1 border-r border-white/5" />
                        ))}
                      </div>

                      {/* Current time indicator */}
                      {isToday && (() => {
                        const now = new Date();
                        const nowH = now.getHours() + now.getMinutes() / 60;
                        if (nowH >= HOUR_START && nowH <= HOUR_END) {
                          const pct = ((nowH - HOUR_START) / (HOUR_END - HOUR_START)) * 100;
                          return (
                            <div
                              className="absolute top-0 bottom-0 w-0.5 z-20"
                              style={{ left: `${pct}%`, background: BRAND_RED, opacity: 0.7 }}
                            />
                          );
                        }
                        return null;
                      })()}

                      {/* Booking blocks */}
                      {facilityBookings.map(b => {
                        const left = timeToPercent(b.startTime);
                        const width = durationPercent(b.startTime, b.endTime);
                        const start = format(parseISO(b.startTime), "H:mm");
                        const end = format(parseISO(b.endTime), "H:mm");
                        return (
                          <div
                            key={b.id}
                            className="absolute top-2 bottom-2 rounded-xl flex items-center justify-center overflow-hidden z-10 border"
                            style={{
                              left: `${left}%`,
                              width: `${width}%`,
                              background: color.bg,
                              borderColor: `${color.border}60`,
                            }}
                            data-testid={`booking-block-${b.id}`}
                          >
                            <span className="text-xs font-black px-1 truncate" style={{ color: color.border }}>
                              {start}–{end}
                            </span>
                          </div>
                        );
                      })}

                      {facilityBookings.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-gray-700 text-xs font-bold uppercase tracking-widest">Voľné</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {bookings && bookings.length === 0 && activeFacilities.length > 0 && (
          <p className="text-center text-gray-600 text-sm font-bold mt-8 uppercase tracking-widest">
            Pre tento deň nie sú žiadne rezervácie
          </p>
        )}
      </div>
    </div>
  );
}
