import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { Loader2, Search, Power, Settings as SettingsIcon, CheckCircle, XCircle } from "lucide-react";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["/api/admin/bookings"],
    enabled: isLoggedIn,
    headers: { "x-admin-password": password }
  } as any);

  const { data: shellySettings } = useQuery({
    queryKey: ["/api/admin/shelly/settings"],
    enabled: isLoggedIn,
    headers: { "x-admin-password": password }
  } as any);

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string, value: string }) => {
      const res = await fetch("/api/admin/shelly/settings", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-password": password 
        },
        body: JSON.stringify({ key, value })
      });
      return res.json();
    }
  });

  const controlShelly = useMutation({
    mutationFn: async ({ zone, action }: { zone: string, action: string }) => {
      const res = await fetch("/api/admin/shelly/control", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-password": password 
        },
        body: JSON.stringify({ zone, action })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Shelly", description: data.message });
    },
    onError: (err: any) => {
      toast({ title: "Chyba", description: err.message, variant: "destructive" });
    }
  });

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-12 max-w-md w-full text-center">
          <h1 className="text-3xl font-display font-black text-white mb-8 uppercase italic">ZARAMIA <span className="text-red-600">ADMIN</span></h1>
          <input 
            type="password"
            placeholder="Heslo správcu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-black border-2 border-white/5 rounded-2xl px-6 py-4 text-white font-bold mb-6 outline-none focus:border-red-600 transition-all text-center"
          />
          <button 
            onClick={() => setIsLoggedIn(true)}
            className="w-full py-4 rounded-2xl bg-red-600 text-white font-black uppercase tracking-widest shadow-[0_0_30px_-5px_rgba(220,38,38,0.5)]"
          >
            Vstúpiť
          </button>
        </div>
      </div>
    );
  }

  const filteredBookings = bookings?.filter((b: any) => 
    b.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
    b.facility?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 bg-black text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <h1 className="text-4xl font-display font-black uppercase tracking-tighter italic">ADMIN <span className="text-red-600">PANEL</span></h1>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input 
              type="text"
              placeholder="Hľadať rezerváciu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border-2 border-white/5 rounded-2xl pl-14 pr-6 py-4 text-white font-bold outline-none focus:border-red-600 transition-all"
            />
          </div>
        </div>

        {/* Shelly Control */}
        <section className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8">
          <h2 className="text-xl font-black uppercase tracking-widest mb-8 flex items-center">
            <Power className="w-6 h-6 mr-3 text-red-600" /> Ovládanie osvetlenia (Shelly)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {['Kurt 1', 'Kurt 2', 'Chodba', 'Terasa'].map(zone => (
              <div key={zone} className="bg-black p-6 rounded-3xl border border-white/5 flex flex-col items-center">
                <span className="font-bold text-gray-500 uppercase text-xs mb-4">{zone}</span>
                <div className="flex space-x-2 w-full">
                  <button 
                    onClick={() => controlShelly.mutate({ zone, action: 'on' })}
                    className="flex-1 py-3 rounded-xl bg-green-600/10 text-green-500 font-black border border-green-600/20 hover:bg-green-600 hover:text-white transition-all"
                  >
                    ON
                  </button>
                  <button 
                    onClick={() => controlShelly.mutate({ zone, action: 'off' })}
                    className="flex-1 py-3 rounded-xl bg-red-600/10 text-red-500 font-black border border-red-600/20 hover:bg-red-600 hover:text-white transition-all"
                  >
                    OFF
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bookings List */}
        <section className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8 overflow-hidden">
          <h2 className="text-xl font-black uppercase tracking-widest mb-8 flex items-center">
            <Calendar className="w-6 h-6 mr-3 text-red-600" /> Všetky rezervácie
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="pb-6 text-xs font-black uppercase tracking-widest text-gray-500">Užívateľ</th>
                  <th className="pb-6 text-xs font-black uppercase tracking-widest text-gray-500">Športovisko</th>
                  <th className="pb-6 text-xs font-black uppercase tracking-widest text-gray-500">Čas</th>
                  <th className="pb-6 text-xs font-black uppercase tracking-widest text-gray-500">Stav</th>
                  <th className="pb-6 text-xs font-black uppercase tracking-widest text-gray-500 text-right">Cena</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-red-600" /></td></tr>
                ) : filteredBookings?.map((b: any) => (
                  <tr key={b.id} className="group">
                    <td className="py-6">
                      <div className="font-bold text-white uppercase text-xs tracking-wide">{b.user?.firstName}</div>
                      <div className="text-[10px] text-gray-500 font-bold">{b.user?.email}</div>
                    </td>
                    <td className="py-6 font-bold text-white uppercase text-xs tracking-wide">{b.facility?.name}</td>
                    <td className="py-6">
                      <div className="text-white font-bold text-xs">{format(new Date(b.startTime), "d. MMMM yyyy", { locale: sk })}</div>
                      <div className="text-gray-500 text-[10px] font-black">{format(new Date(b.startTime), "HH:mm")} - {format(new Date(b.endTime), "HH:mm")}</div>
                    </td>
                    <td className="py-6">
                      <span className={cn(
                        "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                        b.status === 'paid' ? "bg-green-600/10 text-green-500 border-green-600/20" : "bg-red-600/10 text-red-500 border-red-600/20"
                      )}>
                        {b.status === 'paid' ? 'ZAPLATENÉ' : 'REZERVOVANÉ'}
                      </span>
                    </td>
                    <td className="py-6 text-right font-black text-white">{(b.totalPrice/100).toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
