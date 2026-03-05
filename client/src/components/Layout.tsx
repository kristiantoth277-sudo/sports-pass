import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Facebook, Instagram, CalendarDays } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, isAuthenticated, logout, isLoading } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-white font-sans selection:bg-[#1e8c2a]/40 selection:text-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="h-12 w-12 rounded-xl overflow-hidden flex-shrink-0">
                <img
                  src="/images/zaramia_logo_full.jpg"
                  alt="ZaraMia"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-display font-black text-xl tracking-tighter text-white italic">
                  Zara<span style={{color:'#cc1a1a'}}>Mia</span>
                </span>
                <span className="text-[10px] font-bold tracking-widest uppercase" style={{color:'#1e8c2a'}}>
                  pizza, sport &amp; fun
                </span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/" className={cn("text-sm font-black uppercase tracking-widest transition-colors", location === "/" ? "text-[#1e8c2a]" : "text-gray-500 hover:text-white")}>
                Domov
              </Link>
              {isAuthenticated && (
                <Link href="/bookings" className={cn("text-sm font-black uppercase tracking-widest transition-colors", location === "/bookings" ? "text-[#1e8c2a]" : "text-gray-500 hover:text-white")}>
                  Rezervácie
                </Link>
              )}
              <Link href="/schedule" className={cn("flex items-center gap-1.5 text-sm font-black uppercase tracking-widest transition-colors", location === "/schedule" ? "text-[#3b82f6]" : "text-gray-500 hover:text-white")}>
                <CalendarDays className="w-4 h-4" />
                Prehľad
              </Link>
              <Link href="/admin" className={cn("text-sm font-black uppercase tracking-widest transition-colors", location === "/admin" ? "text-[#cc1a1a]" : "text-gray-500 hover:text-white")}>
                Admin
              </Link>
              <a
                href="https://www.facebook.com/pizzazaramia/?locale=sk_SK"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-[#1877F2] transition-colors"
                title="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://www.instagram.com/zaramiapizzasportfun/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-[#E1306C] transition-colors"
                title="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </nav>

            {/* Auth */}
            <div className="flex items-center space-x-4">
              {!isLoading && (
                isAuthenticated ? (
                  <div className="flex items-center space-x-3">
                    <div className="hidden sm:flex flex-col items-end">
                      <span className="text-xs font-black uppercase tracking-widest text-white">{user?.firstName || "Hosť"}</span>
                      <span className="text-[10px] text-gray-500 font-bold">{user?.email}</span>
                    </div>
                    <button
                      onClick={() => logout()}
                      className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 hover:text-[#cc1a1a] hover:bg-[#cc1a1a]/10 transition-all"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => window.location.href = "/api/login"}
                    className="px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-white transition-all border border-[#1e8c2a]/50 hover:bg-[#1e8c2a] hover:border-[#1e8c2a]"
                  >
                    Vstup
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
