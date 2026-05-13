import { useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";

const BRAND_RED = "#cc1a1a";

const NAPOJE_NEALKOHOLICKE = [
  { name: "CAPPY 0,2L", price: "2,30€" },
  { name: "COCACOLA 0,25L", price: "2,30€" },
  { name: "FANTA 0,25L", price: "2,30€" },
  { name: "SPRITE 0,25L", price: "2,30€" },
  { name: "FUZETEA 0,25L", price: "2,30€" },
  { name: "ISOFRUIT 0,5L", price: "2,90€" },
  { name: "GATORADE 0,5L", price: "2,90€" },
  { name: "BIRELL 0,5L", price: "2,30€" },
  { name: "BIRELL OCHUTENÝ 0,5L", price: "2,30€" },
];

const NAPOJE_CAPOVANE_NEALK = [
  { name: "KOFOLA 0,1L", price: "0,60€" },
  { name: "KOFOLA 0,3L", price: "1,70€" },
  { name: "KOFOLA 0,5L", price: "2,80€" },
];

const MINERALKY = [
  { name: "NATURA 0,33L SÝTENÁ", price: "2,90€" },
  { name: "NATURA 0,33L JEMNE SÝTENÁ", price: "2,90€" },
];

const TEPLE_NAPOJE = [
  { name: "ČAJ (PODĽA VÝBERU)", price: "2,90€" },
  { name: "VEĽKÉ PRESSO", price: "2,90€" },
  { name: "MALÉ PRESSO", price: "2,90€" },
  { name: "MED", price: "1,20€" },
  { name: "MLIEKO", price: "0,90€" },
];

const VODKA = [
  { name: "NICOLAUS", price: "2,30€" },
  { name: "NICOLAUS CRANBERRY", price: "2,30€" },
  { name: "NICOLAUS LIME", price: "2,30€" },
  { name: "ABSOLUT", price: "2,90€" },
  { name: "ABSOLUT LIME", price: "2,90€" },
];

const RUM = [
  { name: "CAPTAIN MORGAN", price: "2,90€" },
  { name: "REPUBLICA", price: "3,10€" },
  { name: "DIPLOMATICO", price: "4,30€" },
];

const DESTILATY = [
  { name: "SPIŠSKÁ BOROVIČKA", price: "2,60€" },
  { name: "GOLDEN HRUŠKA", price: "2,60€" },
  { name: "GOLDEN JABLKO", price: "2,60€" },
  { name: "GOLDEN ORECH", price: "2,60€" },
  { name: "ZBOJNÍCKA SLIVOVICA", price: "3,80€" },
];

const BRANDY = [
  { name: "METAXA 5*", price: "3,10€" },
  { name: "METAXA 7*", price: "3,40€" },
  { name: "KARPATSKÉ BRANDY", price: "2,30€" },
];

const APERITIVY = [
  { name: "JAGERMEISTER", price: "3,60€" },
  { name: "BECHEROVKA", price: "3,20€" },
  { name: "FERNET STOCK", price: "2,40€" },
  { name: "FERNET CITRUS", price: "2,40€" },
];

const PIVO = [
  { name: "PIVO 0,3L", price: "1,80€" },
  { name: "PIVO 0,5L", price: "2,30€" },
];

const PIZZA = [
  { name: "MARGHERITA", price: "7,80€", ingredients: "Paradajkový pretlak, mozzarella, oregano, olivový olej, bazalka" },
  { name: "DIAVOLA", price: "8,90€", ingredients: "Paradajkový pretlak, saláma, syr, feferony, oregano" },
  { name: "ŠUNKOVÁ", price: "8,90€", ingredients: "Paradajkový pretlak, šunka, syr, oregano" },
  { name: "KIDS", price: "9,50€", ingredients: "Paradajkový pretlak, šunka, kukurica, syr, oregano" },
  { name: "QUATTRO FORMAGGI", price: "9,50€", ingredients: "Paradajkový pretlak, mozzarella, údený syr, niva, oregano" },
  { name: "HAWAI", price: "8,90€", ingredients: "Paradajkový pretlak, šunka, ananás, syr, oregano" },
  { name: "MEXICKÁ", price: "10,00€", ingredients: "Paradajkový pretlak, saláma, kukurica, feferony, mozzarella, fazuľa" },
  { name: "SEDLIACKÁ", price: "9,90€", ingredients: "Paradajkový pretlak, saláma, slanina, klobása, cibuľa, syr" },
  { name: "JALAPENOS", price: "9,50€", ingredients: "Paradajkový pretlak, saláma, jalapeños, syr, oregano" },
  { name: "QUATTRO STAGIONI", price: "9,90€", ingredients: "Paradajkový pretlak, šunka, šampióny, artyčoky, olivy, syr" },
  { name: "ZARAMIA", price: "10,00€", ingredients: "Paradajkový pretlak, saláma, slanina, šampióny, olivy, cibuľa, syr" },
  { name: "VESUVIO", price: "10,00€", ingredients: "Paradajkový pretlak, saláma, šampióny, kukurica, cibuľa, syr" },
  { name: "MAĎARSKÁ", price: "10,00€", ingredients: "Paradajkový pretlak, slanina, klobása, cibuľa, paprika, syr, oregano" },
  { name: "SLOVENSKÁ", price: "9,90€", ingredients: "Smotana, vyrndza, slanina, cibuľa, paprika, syr, oregano" },
];

function Section({ title, items, icon }: { title: string; items: { name: string; price: string; ingredients?: string }[]; icon?: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 bg-zinc-900 rounded-2xl text-white font-black uppercase tracking-widest text-xs border border-white/5"
      >
        <span>{icon} {title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {open && (
        <div className="mt-1 rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
          {items.map((item, i) => (
            <div key={i} className="flex items-start justify-between px-5 py-3 bg-black/60">
              <div>
                <p className="text-white font-bold text-sm">{item.name}</p>
                {item.ingredients && <p className="text-gray-500 text-xs mt-0.5 font-medium">{item.ingredients}</p>}
              </div>
              <span className="text-red-500 font-black text-sm ml-4 shrink-0">{item.price}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Menu() {
  const [tab, setTab] = useState<'napoje' | 'pizza'>('napoje');

  return (
    <div className="flex-1 bg-black min-h-screen pb-20">
      <div className="relative h-56 flex items-end">
        <img src="/images/pizza.jpg" alt="Menu" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="relative z-10 px-6 pb-6 w-full flex items-end justify-between">
          <div>
            <p className="text-red-500 font-black uppercase tracking-widest text-xs mb-1">ZaraMia Pizza Sport & Fun</p>
            <h1 className="text-4xl font-display font-black text-white uppercase tracking-tighter italic">🍕 MENU</h1>
          </div>
          <Link href="/" className="w-11 h-11 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>
      </div>

      <div className="flex gap-2 px-4 mt-4 mb-4">
        {(['napoje', 'pizza'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${tab === t ? "text-white" : "bg-zinc-900 text-gray-500 hover:text-white"}`}
            style={tab === t ? { background: BRAND_RED } : {}}>
            {t === 'napoje' ? '🥤 Nápoje' : '🍕 Pizza'}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-2">
        {tab === 'napoje' && (
          <>
            <Section title="Nealkoholické nápoje" items={NAPOJE_NEALKOHOLICKE} icon="🥤" />
            <Section title="Čapované — Kofola" items={NAPOJE_CAPOVANE_NEALK} icon="🍺" />
            <Section title="Mineralky" items={MINERALKY} icon="💧" />
            <Section title="Teplé nápoje" items={TEPLE_NAPOJE} icon="☕" />
            <Section title="Vodka 0,4L" items={VODKA} icon="🍸" />
            <Section title="Rum 0,4L" items={RUM} icon="🥃" />
            <Section title="Destiláty 0,4L" items={DESTILATY} icon="🥃" />
            <Section title="Brandy — Cognac 0,4L" items={BRANDY} icon="🥂" />
            <Section title="Aperitív & Likéry 0,4L" items={APERITIVY} icon="🍹" />
            <Section title="Čapované pivo" items={PIVO} icon="🍺" />
          </>
        )}
        {tab === 'pizza' && (
          <Section title="Pizza" items={PIZZA} icon="🍕" />
        )}
      </div>
    </div>
  );
}
