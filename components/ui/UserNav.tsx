'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { WatchlistDrawer } from '@/components/watchlist/WatchlistDrawer';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  User,
  LogOut,
  Bookmark,
  ChevronDown,
  Shield,
  Sparkles,
  LogIn,
} from 'lucide-react';

export function UserNav() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [user, setUser] = useState<{ id?: string; email?: string; name?: string } | null>(null);
  const [isWatchlistOpen, setIsWatchlistOpen] = useState(false);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Check auth status from Supabase or localStorage
  useEffect(() => {
    // Initial watchlist counter
    if (typeof window !== 'undefined') {
      try {
        let count = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('saved_auction_') && localStorage.getItem(key) === 'true') {
            count++;
          }
        }
        setWatchlistCount(count);
      } catch {
        // ignore
      }
    }

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          setUser({
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
          });
        }
      });

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          });
        } else {
          setUser(null);
        }
      });

      return () => {
        listener.subscription.unsubscribe();
      };
    } else {
      // Local fallback session
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('user_session');
        if (stored) {
          try {
            setUser(JSON.parse(stored));
          } catch {
            // ignore
          }
        }
      }
    }
  }, []);

  const handleLogout = async () => {
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user_session');
      }
    }
    setUser(null);
    setIsMenuOpen(false);
    router.refresh();
  };

  return (
    <>
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Watchlist Quick Button with Badge */}
        <button
          type="button"
          onClick={() => setIsWatchlistOpen(true)}
          className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 transition-all hover:border-amber-500/50 shadow-sm"
          title={t.nav.myWatchlist}
        >
          <Bookmark className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
          <span className="hidden sm:inline">{t.nav.myWatchlist}</span>
          {watchlistCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
              {watchlistCount}
            </span>
          )}
        </button>

        {user ? (
          /* User Profile Dropdown */
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 transition-all"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white text-[11px] font-bold">
                {(user.name || user.email || 'I')[0].toUpperCase()}
              </div>
              <span className="max-w-[100px] truncate hidden md:inline">
                {user.name || user.email?.split('@')[0]}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 space-y-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                <div className="p-2 border-b border-slate-800/80">
                  <p className="text-xs font-bold text-white truncate">{user.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                    <Shield className="w-3 h-3" />
                    <span>{t.nav.verifiedInvestor}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsWatchlistOpen(true);
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left"
                >
                  <Bookmark className="w-4 h-4 text-amber-400" />
                  <span>{t.nav.myWatchlist} ({watchlistCount})</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t.nav.logout}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Guest: Sign In Button */
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/40"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{t.nav.investorAccess}</span>
          </Link>
        )}
      </div>

      {/* Watchlist Slide-over Drawer */}
      <WatchlistDrawer
        isOpen={isWatchlistOpen}
        onClose={() => setIsWatchlistOpen(false)}
        userId={user?.id}
        onItemCountChange={setWatchlistCount}
      />
    </>
  );
}
