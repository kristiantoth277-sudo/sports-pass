import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { Loader2, Search, Power, Settings as SettingsIcon, Calendar, CreditCard, Wifi, WifiOff, AlertCircle, Save, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ZONES = [
  { label: 'Svetlo hala', key: 'svetlo_hala_ip' },
  { label: 'Hala2', key: 'hala2_ip' },
  { label: 'Hala3', key: 'hala3_ip' },
  { label: 'Bar bar', key: 'bar_bar_ip' },
];

export default function Admin() {
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginPending, setLoginPending] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<'bookings' | 'shelly' | 'settings'>('bookings');
  const [ipInputs, setIpInputs] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["/api/admin/bookings"],
    enabled: isLoggedIn,
    headers: { "x-admin-password": password }
  } as any);

  const { data: shellySettings, refetch: refetchSettings } = useQuery({
    queryKey: ["/api/admin/shelly/settings"],
    enabled: isLoggedIn,
    headers: { "x-admin-password": password }
  } as any);

  const { data: shellyStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ["/api/admin/shelly/status"],
    enabled: isLoggedIn && activeTab === 'shelly',
    refetchInterval: 15000,
    headers: { "x-admin-password": password }
  } as any);

  useEffect(() => {
    if (shellySettings && Array.isArray(shellySettings)) {
      const map: Record<string, string> = {};
      shellySettings.forEach((s: any) => { map[s.key] = s.value; });
      setIpInputs(map);
    }
  }, [shellySettings]);

  const markPaid = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await fetch(`/api/admin/bookings/${bookingId}/mark-paid`, {
        method: "POST",
        headers: { "x-admin-password": password },
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Chyba");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      toast({ title: "Rezervácia označená ako zaplatená" });
    },
    onError: (err: any) => {
      toast({ title: "Chyba", description: err.message, variant: "destructive" });
    }
  });

  const saveIp = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await fetch("/api/admin/shelly/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ key, value })
      });
      if (!res.ok) throw new Error("Chyba uloženia");
      return res.json();
    },
    onSuccess: () => {
      refetchSettings();
      toast({ title: "Nastavenia uložené" });
    },
    onError: (err: any) => {
      toast({ title: "Chyba", description: err.message, variant: "destructive" });
    }
  });

  const saveAllIps = async () => {
    for (const zone of ZONES) {
      const val = ipInputs[zone.key] || "";
      await saveIp.mutateAsync({ key: zone.key, value: val });
    }
    refetchStatus();
  };

  const controlShelly = useMutation({
    mutationFn: async ({ zone, action }: { zone: string; action: string }) => {
      const res = await fetch("/api/admin/shelly/control", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ zone, action })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Shelly", description: data.message });
      refetchStatus();
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
            onKeyDown={(e) => e.key === 'Enter' && !loginPending && password && document.getElementById('login-btn')?.click()}
            data-testid="input-admin-password"
            className="w-full bg-black border-2 border-white/5 rounded-2xl px-6 py-4 text-white font-bold mb-6 outline-none focus:border-red-600 transition-all text-center"
          />
          <button
            id="login-btn"
            data-testid="button-admin-login"
            onClick={async () => {
              setLoginError("");
              setLoginPending(true);
              try {
                const res = await fetch("/api/admin/ping", { headers: { "x-admin-password": password } });
                if (res.ok) { setIsLoggedIn(true); } else { setLoginError("Nesprávne heslo"); }
              } catch { setLoginError("Chyba pripojenia"); } finally { setLoginPending(false); }
            }}
            disabled={loginPending || !password}
            className="w-full py-4 rounded-2xl bg-red-600 text-white font-black uppercase tracking-widest shadow-[0_0_30px_-5px_rgba(220,38,38,0.5)] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loginPending ? <><Loader2 className="w-5 h-5 animate-spin" /> Overujem...</> : "Vstúpiť"}
          </button>
          {loginError && <p className="text-red-400 text-sm mt-3 font-medium">{loginError}</p>}
        </div>
      </div>
    );
  }

  const filteredBookings = bookings?.filter((b: any) =>
    b.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
    b.facility?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusInfo = (zone: string) => {
    if (!shellyStatus) return null;
    return (shellyStatus as any[]).find((s) => s.zone === zone);
  };

  return (
    <div className="flex-1 bg-black text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <h1 className="text-4xl font-display font-black uppercase tracking-tighter italic">ADMIN <span className="text-red-600">PANEL</span></h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 pb-0">
          {[
            { id: 'bookings', label: 'Rezervácie', icon: Calendar },
            { id: 'shelly', label: 'Shelly Ovládanie', icon: Power },
            { id: 'settings', label: 'Shelly Nastavenia', icon: SettingsIcon },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              data-testid={`tab-${id}`}
              onClick={() => setActiveTab(id as any)}
              className={cn(
                "flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-widest rounded-t-xl transition-all",
                activeTab === id
                  ? "bg-zinc-900 text-white border border-white/10 border-b-zinc-900 -mb-px"
                  : "text-gray-500 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <section className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8 overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <h2 className="text-xl font-black uppercase tracking-widest flex items-center">
                <Calendar className="w-6 h-6 mr-3 text-red-600" /> Všetky rezervácie
              </h2>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Hľadať..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-search"
                  className="w-full bg-black border-2 border-white/5 rounded-2xl pl-12 pr-5 py-3 text-white font-bold outline-none focus:border-red-600 transition-all text-sm"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="pb-5 text-xs font-black uppercase tracking-widest text-gray-500">Užívateľ</th>
                    <th className="pb-5 text-xs font-black uppercase tracking-widest text-gray-500">Športovisko</th>
                    <th className="pb-5 text-xs font-black uppercase tracking-widest text-gray-500">Čas</th>
                    <th className="pb-5 text-xs font-black uppercase tracking-widest text-gray-500">Stav</th>
                    <th className="pb-5 text-xs font-black uppercase tracking-widest text-gray-500 text-right">Cena</th>
                    <th className="pb-5 text-xs font-black uppercase tracking-widest text-gray-500 text-right">Akcia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoading ? (
                    <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-red-600" /></td></tr>
                  ) : filteredBookings?.map((b: any) => (
                    <tr key={b.id} data-testid={`row-booking-${b.id}`} className="group">
                      <td className="py-5">
                        <div className="font-bold text-white uppercase text-xs tracking-wide">{b.user?.firstName}</div>
                        <div className="text-[10px] text-gray-500 font-bold">{b.user?.email}</div>
                      </td>
                      <td className="py-5 font-bold text-white uppercase text-xs tracking-wide">{b.facility?.name}</td>
                      <td className="py-5">
                        <div className="text-white font-bold text-xs">{format(new Date(b.startTime), "d. MMMM yyyy", { locale: sk })}</div>
                        <div className="text-gray-500 text-[10px] font-black">{format(new Date(b.startTime), "HH:mm")} – {format(new Date(b.endTime), "HH:mm")}</div>
                      </td>
                      <td className="py-5">
                        <span className={cn(
                          "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                          b.status === 'paid' ? "bg-green-600/10 text-green-500 border-green-600/20" : "bg-red-600/10 text-red-500 border-red-600/20"
                        )}>
                          {b.status === 'paid' ? 'ZAPLATENÉ' : 'REZERVOVANÉ'}
                        </span>
                      </td>
                      <td className="py-5 text-right font-black text-white">{(b.totalPrice / 100).toFixed(2)} €</td>
                      <td className="py-5 text-right">
                        {b.status !== 'paid' && (
                          <button
                            onClick={() => markPaid.mutate(b.id)}
                            disabled={markPaid.isPending}
                            data-testid={`button-mark-paid-${b.id}`}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-green-600/10 text-green-500 border border-green-600/20 hover:bg-green-600 hover:text-white transition-all flex items-center gap-1 ml-auto"
                          >
                            <CreditCard className="w-3 h-3" /> Označiť zaplatené
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Shelly Control Tab */}
        {activeTab === 'shelly' && (
          <section className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black uppercase tracking-widest flex items-center">
                <Power className="w-6 h-6 mr-3 text-red-600" /> Ovládanie osvetlenia
              </h2>
              <button
                onClick={() => refetchStatus()}
                disabled={statusLoading}
                data-testid="button-refresh-status"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-gray-400 hover:text-white text-xs font-black uppercase tracking-widest transition-all"
              >
                <RefreshCw className={cn("w-4 h-4", statusLoading && "animate-spin")} /> Obnoviť
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {ZONES.map(({ label }) => {
                const st = getStatusInfo(label);
                return (
                  <div key={label} className="bg-black p-6 rounded-3xl border border-white/5 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-white uppercase text-sm">{label}</span>
                      <StatusBadge status={st?.status} loading={statusLoading} />
                    </div>
                    {st?.ip && (
                      <span className="text-[10px] text-gray-600 font-mono">{st.ip}</span>
                    )}
                    {st?.status === 'unconfigured' ? (
                      <p className="text-[10px] text-yellow-500 font-bold">IP nie je nastavená</p>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          data-testid={`button-shelly-on-${label}`}
                          onClick={() => controlShelly.mutate({ zone: label, action: 'on' })}
                          disabled={controlShelly.isPending}
                          className="flex-1 py-3 rounded-xl bg-green-600/10 text-green-500 font-black border border-green-600/20 hover:bg-green-600 hover:text-white transition-all text-sm disabled:opacity-50"
                        >
                          ON
                        </button>
                        <button
                          data-testid={`button-shelly-off-${label}`}
                          onClick={() => controlShelly.mutate({ zone: label, action: 'off' })}
                          disabled={controlShelly.isPending}
                          className="flex-1 py-3 rounded-xl bg-red-600/10 text-red-500 font-black border border-red-600/20 hover:bg-red-600 hover:text-white transition-all text-sm disabled:opacity-50"
                        >
                          OFF
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-600 mt-6 font-medium">
              Status sa automaticky aktualizuje každých 15 sekúnd. Shelly zariadenia musia byť dostupné v rovnakej sieti ako server.
            </p>
          </section>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <section className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8">
            <h2 className="text-xl font-black uppercase tracking-widest mb-2 flex items-center">
              <SettingsIcon className="w-6 h-6 mr-3 text-red-600" /> Shelly IP Nastavenia
            </h2>
            <p className="text-gray-500 text-sm mb-8 font-medium">
              Zadaj IP adresu každého Shelly zariadenia v lokálnej sieti (napr. <span className="font-mono text-gray-400">192.168.1.50</span>).
              Zariadenia musia byť Gen1 Shelly s HTTP relay API.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {ZONES.map(({ label, key }) => (
                <div key={key} className="bg-black rounded-2xl p-6 border border-white/5">
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-3">{label}</label>
                  <div className="flex gap-3 items-center">
                    <Wifi className="w-5 h-5 text-gray-600 shrink-0" />
                    <input
                      type="text"
                      placeholder="192.168.1.xx"
                      value={ipInputs[key] || ""}
                      onChange={(e) => setIpInputs(prev => ({ ...prev, [key]: e.target.value }))}
                      data-testid={`input-shelly-ip-${key}`}
                      className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm outline-none focus:border-red-600 transition-all"
                    />
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={saveAllIps}
              disabled={saveIp.isPending}
              data-testid="button-save-shelly-settings"
              className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-red-600 text-white font-black uppercase tracking-widest shadow-[0_0_20px_-5px_rgba(220,38,38,0.5)] hover:bg-red-700 transition-all disabled:opacity-50"
            >
              {saveIp.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Uložiť nastavenia
            </button>
            <div className="mt-10 bg-black rounded-2xl p-6 border border-yellow-600/20">
              <h3 className="text-xs font-black uppercase tracking-widest text-yellow-500 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Inštalácia a sieť
              </h3>
              <ul className="text-xs text-gray-400 space-y-2 font-medium list-disc list-inside">
                <li>Shelly zariadenia musia byť pripojené k rovnakej WiFi sieti ako tento server</li>
                <li>Skontroluj IP adresu v Shelly aplikácii alebo v routeri</li>
                <li>Pre Gen2 zariadenia (Shelly Plus, Pro) je potrebná iná konfigurácia</li>
                <li>Timeout pre každé zariadenie je 4 sekundy</li>
              </ul>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

function StatusBadge({ status, loading }: { status?: string; loading?: boolean }) {
  if (loading) return <Loader2 className="w-4 h-4 animate-spin text-gray-500" />;
  if (!status || status === 'unconfigured') return (
    <span className="text-[10px] font-black uppercase text-yellow-600 flex items-center gap-1">
      <AlertCircle className="w-3 h-3" /> —
    </span>
  );
  if (status === 'offline') return (
    <span className="text-[10px] font-black uppercase text-red-500 flex items-center gap-1">
      <WifiOff className="w-3 h-3" /> OFFLINE
    </span>
  );
  if (status === 'on') return (
    <span className="text-[10px] font-black uppercase text-green-400 flex items-center gap-1">
      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" /> ON
    </span>
  );
  return (
    <span className="text-[10px] font-black uppercase text-gray-500 flex items-center gap-1">
      <span className="w-2 h-2 rounded-full bg-gray-600 inline-block" /> OFF
    </span>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
