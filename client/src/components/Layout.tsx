import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Activity, Calendar, LayoutDashboard, LogIn, LogOut, Settings, Facebook } from "lucide-react";
import { useState } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, isAuthenticated, logout, isLoading } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-black text-white font-sans selection:bg-red-600 selection:text-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(220,38,38,0.3)]">
                <img src="/images/zaramia_logo.jpg" alt="Zaramia Logo" className="w-full h-full object-cover" />
              </div>
              <span className="font-display font-black text-2xl tracking-tighter text-white uppercase italic">
                ZARAMIA<span className="text-red-600">.</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/" className={cn("text-sm font-black uppercase tracking-widest transition-colors hover:text-red-600", location === "/" ? "text-red-600" : "text-gray-500")}>
                Domov
              </Link>
              {isAuthenticated && (
                <Link href="/bookings" className={cn("text-sm font-black uppercase tracking-widest transition-colors hover:text-red-600", location === "/bookings" ? "text-red-600" : "text-gray-500")}>
                  Rezervácie
                </Link>
              )}
              <Link href="/admin" className={cn("text-sm font-black uppercase tracking-widest transition-colors hover:text-red-600", location === "/admin" ? "text-red-600" : "text-gray-500")}>
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
            </nav>

            <div className="flex items-center space-x-6">
              {!isLoading && (
                isAuthenticated ? (
                  <div className="flex items-center space-x-4">
                    <div className="hidden sm:flex flex-col items-end">
                      <span className="text-xs font-black uppercase tracking-widest text-white">{user?.firstName || "Hosť"}</span>
                      <span className="text-[10px] text-gray-500 uppercase font-bold">{user?.email}</span>
                    </div>
                    <button onClick={() => logout()} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-600/10 transition-all">
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => window.location.href = "/api/login"} className="px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest bg-white text-black hover:bg-red-600 hover:text-white transition-all">
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
