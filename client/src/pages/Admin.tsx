import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { Loader2, Search, Power, Settings as SettingsIcon, Calendar, CreditCard, Wifi, WifiOff, AlertCircle, Save, RefreshCw, Zap, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ZONES = [
  { label: 'Svetlo hala', ipKey: 'svetlo_hala_ip', idKey: 'svetlo_hala_id' },
  { label: 'Hala2',       ipKey: 'hala2_ip',       idKey: 'hala2_id' },
  { label: 'Hala3',       ipKey: 'hala3_ip',       idKey: 'hala3_id' },
  { label: 'Bar bar',     ipKey: 'bar_bar_ip',      idKey: 'bar_bar_id' },
];

const KNOWN_DEVICES: Record<string, { ip: string; id: string }> = {
  'Svetlo hala': { ip: '192.168.0.124', id: 'e4b0636a5bc8' },
  'Hala2':       { ip: '192.168.0.107', id: 'e4b063740efc' },
  'Hala3':       { ip: '192.168.0.103', id: 'e4b06375cb3c' },
  'Bar bar':     { ip: '192.168.0.104', id: 'e4b063787f7c' },
};

export default function Admin() {
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginPending, setLoginPending] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<'bookings' | 'shelly' | 'settings'>('bookings');
  const [ipInputs, setIpInputs] = useState<Record<string, string>>({});
  const [discoveredDevices, setDiscoveredDevices] = useState<any[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["/api/admin/bookings", password],
    enabled: isLoggedIn,
    queryFn: async () => {
      const res = await fetch("/api/admin/bookings", { headers: { "x-admin-password": password } });
      return res.json();
    }
  });

  const { data: shellySettings, refetch: refetchSettings } = useQuery({
    queryKey: ["/api/admin/shelly/settings", password],
    enabled: isLoggedIn,
    queryFn: async () => {
      const res = await fetch("/api/admin/shelly/settings", { headers: { "x-admin-password": password } });
      return res.json();
    }
  });

  const { data: shellyStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ["/api/admin/shelly/status", password],
    enabled: isLoggedIn && activeTab === 'shelly',
    refetchInterval: 15000,
    queryFn: async () => {
      const res = await fetch("/api/admin/shelly/status", { headers: { "x-admin-password": password } });
      return res.json();
    }
  });

  useEffect(() => {
    // Start with known device defaults
    const defaults: Record<string, string> = {};
    for (const zone of ZONES) {
      const known = KNOWN_DEVICES[zone.label];
      if (known) {
        defaults[zone.ipKey] = known.ip;
        defaults[zone.idKey] = known.id;
      }
    }
    // Override with saved DB settings
    if (shellySettings && Array.isArray(shellySettings)) {
      shellySettings.forEach((s: any) => { if (s.value) defaults[s.key] = s.value; });
    }
    setIpInputs(defaults);
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

  const discoverDevices = async () => {
    setIsDiscovering(true);
    setDiscoveredDevices([]);
    try {
      const res = await fetch("/api/admin/shelly/discover", {
        headers: { "x-admin-password": password }
      });
      const data = await res.json();
      if (data.success && data.devices.length > 0) {
        setDiscoveredDevices(data.devices);
        // Auto-fill server
        if (data.server) {
          setIpInputs(prev => ({ ...prev, shelly_server: data.server }));
        }
        // Auto-map device IDs by name match
        const newInputs: Record<string, string> = { shelly_server: data.server };
        for (const zone of ZONES) {
          const matched = data.devices.find((d: any) =>
            d.name?.toLowerCase() === zone.label.toLowerCase()
          );
          if (matched) newInputs[zone.idKey] = matched.id;
        }
        setIpInputs(prev => ({ ...prev, ...newInputs }));
        toast({ title: `Nájdených ${data.devices.length} zariadení`, description: "Skontroluj priradenie a ulož nastavenia." });
      } else {
        toast({ title: "Žiadne zariadenia", description: data.message || "Zapni API integráciu v Shelly aplikácii.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Chyba", description: "Nepodarilo sa spojiť so Shelly Cloud", variant: "destructive" });
    } finally {
      setIsDiscovering(false);
    }
  };

  const saveAllSettings = async () => {
    const keysToSave: string[] = [];
    for (const zone of ZONES) {
      keysToSave.push(zone.ipKey, zone.idKey);
    }
    keysToSave.push('shelly_server');
    for (const key of keysToSave) {
      await saveIp.mutateAsync({ key, value: ipInputs[key] || "" });
    }
    refetchStatus();
  };

  const [localStatuses, setLocalStatuses] = useState<Record<string, 'on' | 'off' | 'offline' | 'unknown'>>({});

  // Try direct browser → Shelly HTTPS (Gen2 RPC), fallback to server-side
  const controlShelly = useMutation({
    mutationFn: async ({ zone, action }: { zone: string; action: string }) => {
      const known = KNOWN_DEVICES[zone];
      // Server-side control
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
      toast({ title: "✓ Shelly", description: data.message });
      refetchStatus();
    },
    onError: (err: any) => {
      toast({ title: "Chyba", description: err.message, variant: "destructive" });
    }
  });

  // Poll local status directly from browser
  useEffect(() => {
    if (!isLoggedIn || activeTab !== 'shelly') return;
    const poll = async () => {
      for (const zone of ZONES) {
        const known = KNOWN_DEVICES[zone.label];
        if (!known?.ip) continue;
        try {
          const r = await fetch(`/api/admin/shelly/status/${encodeURIComponent(zone.label)}`, {
            headers: { "x-admin-password": password }
          });
          if (r.ok) {
            const d = await r.json();
            setLocalStatuses(prev => ({ ...prev, [zone.label]: d.output ? 'on' : 'off' }));
          } else {
            setLocalStatuses(prev => ({ ...prev, [zone.label]: 'offline' }));
          }
        } catch {
          setLocalStatuses(prev => ({ ...prev, [zone.label]: 'offline' }));
        }
      }
    };
    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [isLoggedIn, activeTab]);

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
                    <tr key={b.booking.id} data-testid={`row-booking-${b.booking.id}`} className="group">
                      <td className="py-5">
                        <div className="font-bold text-white uppercase text-xs tracking-wide">{b.user?.firstName}</div>
                        <div className="text-[10px] text-gray-500 font-bold">{b.user?.email}</div>
                      </td>
                      <td className="py-5 font-bold text-white uppercase text-xs tracking-wide">{b.facility?.name}</td>
                      <td className="py-5">
                        <div className="text-white font-bold text-xs">{format(new Date(b.booking.startTime), "d. MMMM yyyy", { locale: sk })}</div>
                        <div className="text-gray-500 text-[10px] font-black">{format(new Date(b.booking.startTime), "HH:mm")} – {format(new Date(b.booking.endTime), "HH:mm")}</div>
                      </td>
                      <td className="py-5">
                        <span className={cn(
                          "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                          b.booking.status === 'paid' ? "bg-green-600/10 text-green-500 border-green-600/20" : "bg-red-600/10 text-red-500 border-red-600/20"
                        )}>
                          {b.booking.status === 'paid' ? 'ZAPLATENÉ' : 'REZERVOVANÉ'}
                        </span>
                      </td>
                      <td className="py-5 text-right font-black text-white">{(b.booking.totalPrice / 100).toFixed(2)} €</td>
                      <td className="py-5 text-right">
                        {b.booking.status !== 'paid' && (
                          <button
                            onClick={() => markPaid.mutate(b.booking.id)}
                            disabled={markPaid.isPending}
                            data-testid={`button-mark-paid-${b.booking.id}`}
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
          <section className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black uppercase tracking-widest flex items-center">
                <Power className="w-6 h-6 mr-3 text-red-600" /> Ovládanie osvetlenia
              </h2>
            </div>

            {/* One-time cert setup */}
            <div className="bg-yellow-950/20 border border-yellow-600/20 rounded-2xl p-5">
              <h3 className="text-xs font-black uppercase tracking-widest text-yellow-500 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Prvé použitie — Prijmi certifikát (raz pre každé zariadenie)
              </h3>
              <p className="text-[11px] text-gray-400 mb-3 font-medium">
                Musíš byť pripojený na WiFi zariadenia (192.168.0.x). Otvor každý odkaz, klikni "Pokročilé" → "Pokračovať" a zatvor.
              </p>
              <div className="flex flex-wrap gap-2">
                {ZONES.map(({ label }) => {
                  const ip = KNOWN_DEVICES[label]?.ip;
                  return ip ? (
                    <a key={label} href={`https://${ip}`} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-yellow-600/10 text-yellow-400 border border-yellow-600/20 text-[11px] font-black hover:bg-yellow-600 hover:text-white transition-all">
                      {label} ({ip})
                    </a>
                  ) : null;
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {ZONES.map(({ label }) => {
                const localStatus = localStatuses[label];
                return (
                  <div key={label} className={cn(
                    "bg-black p-6 rounded-3xl border flex flex-col gap-4 transition-all",
                    localStatus === 'on' ? "border-green-600/30 shadow-[0_0_20px_-8px_rgba(22,163,74,0.4)]" : "border-white/5"
                  )}>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-white uppercase text-sm">{label}</span>
                      <LocalStatusBadge status={localStatus} />
                    </div>
                    <span className="text-[10px] text-gray-600 font-mono">{KNOWN_DEVICES[label]?.ip}</span>
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
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <section className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8 space-y-8">

            {/* Shelly Auto Script */}
            <ShellyScriptSection />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black uppercase tracking-widest mb-1 flex items-center">
                  <SettingsIcon className="w-6 h-6 mr-3 text-red-600" /> Shelly Nastavenia (manuálne)
                </h2>
                <p className="text-gray-500 text-sm font-medium">
                  Voliteľné — pre manuálne priradenie Device ID a IP adries.
                </p>
              </div>
              <button
                onClick={discoverDevices}
                disabled={isDiscovering}
                data-testid="button-shelly-discover"
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 shrink-0"
              >
                {isDiscovering ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                Discover zariadenia
              </button>
            </div>

            {/* Discovered devices */}
            {discoveredDevices.length > 0 && (
              <div className="bg-blue-950/30 border border-blue-600/20 rounded-2xl p-5">
                <h3 className="text-xs font-black uppercase tracking-widest text-blue-400 mb-4">
                  Nájdené zariadenia ({discoveredDevices.length})
                </h3>
                <div className="space-y-2">
                  {discoveredDevices.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-4 bg-black/40 rounded-xl px-4 py-3">
                      <div>
                        <span className="text-white font-bold text-sm">{d.name}</span>
                        <span className="text-gray-500 text-[10px] font-mono ml-3">{d.id}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn("text-[10px] font-black uppercase", d.online ? "text-green-400" : "text-gray-500")}>
                          {d.online ? "● Online" : "○ Offline"}
                        </span>
                        {/* Quick assign buttons */}
                        <select
                          className="bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white font-bold"
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              setIpInputs(prev => ({ ...prev, [e.target.value]: d.id }));
                              toast({ title: `${d.name} priradený`, description: ZONES.find(z => z.idKey === e.target.value)?.label });
                            }
                          }}
                        >
                          <option value="">Priraď k zóne...</option>
                          {ZONES.map(z => <option key={z.idKey} value={z.idKey}>{z.label}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-yellow-950/20 border border-yellow-600/20 rounded-2xl p-5">
              <h3 className="text-xs font-black uppercase tracking-widest text-yellow-500 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Ako aktivovať API integráciu
              </h3>
              <ol className="text-xs text-gray-400 space-y-1.5 font-medium list-decimal list-inside">
                <li>Otvor Shelly aplikáciu</li>
                <li>Klikni na zariadenie (Svetlo hala, Hala2, atď.)</li>
                <li>Prejdi do <span className="text-white font-bold">⚙ Settings → Integration</span></li>
                <li>Zapni <span className="text-white font-bold">Allow access</span></li>
                <li>Opakuj pre každé zariadenie</li>
                <li>Potom klikni tlačidlo <span className="text-blue-400 font-bold">Discover zariadenia</span> vyššie</li>
              </ol>
            </div>

            {/* Cloud API section */}
            <div className="bg-black rounded-2xl p-6 border border-white/5 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-blue-400 mb-1">☁ Shelly Cloud API (odporúčané)</h3>
              <p className="text-[11px] text-gray-500 font-medium mb-4">
                Device ID nájdeš v Shelly appke: klikni na zariadenie → ⚙ Settings → Device Info → <span className="font-mono text-gray-400">Device ID</span>
              </p>

              {/* Server URL */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Shelly Cloud Server URL</label>
                <input
                  type="text"
                  placeholder="shelly-97-eu.shelly.cloud"
                  value={ipInputs['shelly_server'] || ""}
                  onChange={(e) => setIpInputs(prev => ({ ...prev, shelly_server: e.target.value }))}
                  data-testid="input-shelly-server"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm outline-none focus:border-blue-500 transition-all"
                />
                <p className="text-[10px] text-gray-600 mt-1 font-medium">Nájdeš ho v Shelly app → Settings → Cloud → Server</p>
              </div>

              {/* Device IDs grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ZONES.map(({ label, idKey }) => (
                  <div key={idKey}>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{label} — Device ID</label>
                    <input
                      type="text"
                      placeholder="napr. shellyplug-s-abc123"
                      value={ipInputs[idKey] || ""}
                      onChange={(e) => setIpInputs(prev => ({ ...prev, [idKey]: e.target.value }))}
                      data-testid={`input-shelly-id-${idKey}`}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Local IP section */}
            <div className="bg-black rounded-2xl p-6 border border-white/5 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">🌐 Lokálna sieť (záloha / alternatíva)</h3>
              <p className="text-[11px] text-gray-500 font-medium mb-4">
                Funguje len ak je server v rovnakej WiFi sieti ako Shelly zariadenia.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ZONES.map(({ label, ipKey }) => (
                  <div key={ipKey}>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{label} — IP adresa</label>
                    <div className="flex gap-2 items-center">
                      <Wifi className="w-4 h-4 text-gray-600 shrink-0" />
                      <input
                        type="text"
                        placeholder="192.168.1.xx"
                        value={ipInputs[ipKey] || ""}
                        onChange={(e) => setIpInputs(prev => ({ ...prev, [ipKey]: e.target.value }))}
                        data-testid={`input-shelly-ip-${ipKey}`}
                        className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm outline-none focus:border-red-600 transition-all"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={saveAllSettings}
              disabled={saveIp.isPending}
              data-testid="button-save-shelly-settings"
              className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-red-600 text-white font-black uppercase tracking-widest shadow-[0_0_20px_-5px_rgba(220,38,38,0.5)] hover:bg-red-700 transition-all disabled:opacity-50"
            >
              {saveIp.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Uložiť všetky nastavenia
            </button>
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

const SHELLY_SCRIPT_TEMPLATE = (zone: string) => `// Zaramia Auto-Svetlo — ${zone}
// Otvor https://<IP> -> Scripts -> + Add Script -> Save -> Start

let ZONE = "${zone}";
let BASE = "https://zaramia.sk/api/shelly/check?zone=";
let URL = BASE + encodeURIComponent(ZONE);
let INTERVAL = 60000;

function checkAndSet() {
  Shelly.call("HTTP.Request", {
    method: "GET",
    url: URL,
    timeout: 10,
    ssl_ca: "*"
  }, function(res, err) {
    if (err === 0 && res && res.code === 200) {
      let data = JSON.parse(res.body);
      Shelly.call("Switch.Set", {id: 0, on: data.on});
      print("Svetlo:", data.on ? "ZAP" : "VYP", "-", data.reason);
    } else {
      print("Chyba HTTP:", err);
    }
  });
}

checkAndSet();
Timer.set(INTERVAL, true, checkAndSet);`;

function ShellyScriptSection() {
  const [activeZone, setActiveZone] = useState('Svetlo hala');
  const [copied, setCopied] = useState(false);

  const script = SHELLY_SCRIPT_TEMPLATE(activeZone);
  const zoneIp = KNOWN_DEVICES[activeZone]?.ip || '';

  const copy = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-green-950/20 border border-green-600/20 rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="text-lg font-black uppercase tracking-widest text-green-400 flex items-center gap-2 mb-1">
          <Zap className="w-5 h-5" /> Automatické svetlo podľa rezervácií
        </h2>
        <p className="text-[12px] text-gray-400 font-medium">
          Hala: zapne sa <strong className="text-white">1 min po platbe</strong>, vypne po <strong className="text-white">65 min</strong>. &nbsp;|&nbsp;
          Bar: svieti <strong className="text-white">0–10 min</strong> (príchod) a <strong className="text-white">60–75 min</strong> (odchod) od platby.
        </p>
      </div>

      {/* Zone tabs */}
      <div className="flex flex-wrap gap-2">
        {ZONES.map(({ label }) => (
          <button
            key={label}
            onClick={() => { setActiveZone(label); setCopied(false); }}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all border",
              activeZone === label
                ? "bg-green-600 text-white border-green-600"
                : "bg-black text-gray-400 border-white/10 hover:border-green-600/40 hover:text-white"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Script preview */}
      <div className="relative">
        <pre className="bg-black rounded-xl p-4 text-[11px] font-mono text-green-300 overflow-x-auto whitespace-pre leading-relaxed border border-green-900/40">
          {script}
        </pre>
        <button
          onClick={copy}
          data-testid={`button-copy-shelly-script-${activeZone}`}
          className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all"
        >
          {copied ? <><Check className="w-3 h-3" /> OK!</> : <><Copy className="w-3 h-3" /> Kopírovať</>}
        </button>
      </div>

      <div className="bg-black/40 rounded-xl p-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-white mb-3">
          Inštalácia — {activeZone} <span className="font-mono text-green-400 font-normal normal-case tracking-normal">({zoneIp})</span>
        </h3>
        <ol className="text-[12px] text-gray-300 space-y-1.5 list-decimal list-inside font-medium">
          <li>Otvor <span className="font-mono text-green-400">https://{zoneIp}</span> (musíš byť na WiFi haly)</li>
          <li>Prijmi varovanie → Pokročilé → Pokračovať</li>
          <li>V ľavom menu klikni ikonu <span className="font-mono">{"</>"}</span> Scripts → <strong>+ Add Script</strong></li>
          <li>Vlož skopírovaný kód → <strong>Save</strong> → <strong>▶ Start</strong></li>
          <li>Zopakuj pre každú zónu zvlášť (iný script pre každú!)</li>
        </ol>
      </div>
    </div>
  );
}

function LocalStatusBadge({ status }: { status?: 'on' | 'off' | 'offline' | 'unknown' }) {
  if (!status) return <span className="text-[10px] font-black uppercase text-gray-600">—</span>;
  if (status === 'on') return (
    <span className="text-[10px] font-black uppercase text-green-400 flex items-center gap-1">
      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" /> ON
    </span>
  );
  if (status === 'offline') return (
    <span className="text-[10px] font-black uppercase text-red-500 flex items-center gap-1">
      <WifiOff className="w-3 h-3" /> OFFLINE
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
// st 13. mája 2026 14:58:23 CEST
