'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Auction } from '@/lib/types/auction';
import { 
  formatCurrency, 
  formatArea, 
  getDaysUntilAuction, 
  calculateInvestorMetrics, 
  detectPropertyCharacteristics,
  getLiveAuctionProgressionState,
  isPropertyNewToday,
} from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { PropertyTypeBadge, PROPERTY_TYPE_CONFIGS } from '@/components/ui/PropertyTypeIcon';
import { DealAlphaBadge } from '@/components/ui/DealAlphaBadge';
import {
  Calendar,
  Bookmark,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Compass,
  Building,
  TreePine,
  Sparkles,
  MapPin,
  Maximize2,
} from 'lucide-react';

interface AuctionRowCardProps {
  auction: Auction;
  isSelected?: boolean;
  onSelect?: (auction: Auction) => void;
}

export function AuctionRowCard({
  auction,
  isSelected = false,
  onSelect,
}: AuctionRowCardProps) {
  const { t, language } = useLanguage();
  const [isSaved, setIsSaved] = useState(false);

  // Initialize saved state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`saved_auction_${auction.id}`);
      if (saved === 'true') {
        setIsSaved(true);
      }
    } catch {
      // ignore localStorage errors in private browsing
    }
  }, [auction.id]);

  const handleToggleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    try {
      localStorage.setItem(`saved_auction_${auction.id}`, String(nextSaved));
    } catch {
      // ignore
    }
  };

  const liveState = getLiveAuctionProgressionState(auction);
  const activeDate = liveState.currentAuctionDate || auction.auction_date_call_1;
  const countdown = getDaysUntilAuction(activeDate, language);
  const metrics = calculateInvestorMetrics(auction, (liveState.currentCallNumber || 1) as (1 | 2 | 3));
  const marginPct = auction.estimated_margin_pct || 0;
  const isNewToday = isPropertyNewToday(auction.created_at);

  // Detect property characteristics
  const {
    propertyType,
    hasConstruction,
    hasPublicRoad,
    isCondominio,
    mortgagePriority: priority,
  } = detectPropertyCharacteristics(auction);

  // Margin badge color styling
  let marginBadgeClass = 'bg-sky-950/90 border-sky-500/40 text-sky-300';
  if (marginPct >= 35) {
    marginBadgeClass = 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300';
  } else if (marginPct >= 20) {
    marginBadgeClass = 'bg-amber-950/90 border-amber-500/50 text-amber-300';
  }

  return (
    <div
      onClick={() => onSelect && onSelect(auction)}
      className={`group relative bg-slate-900/90 border rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'border-emerald-500 ring-2 ring-emerald-500/40 shadow-xl shadow-emerald-950/30 bg-slate-900'
          : 'border-slate-800/90 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-black/40 hover:bg-slate-900/95'
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
        
        {/* ================= COLUMN 1: TYPE, LOCATION & IDENTIFIERS ================= */}
        <div className="lg:w-[30%] space-y-2.5">
          {/* Top category tags & badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <PropertyTypeBadge type={propertyType} language={language} size="sm" />

            {isNewToday && (
              <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 text-slate-950 flex items-center gap-1 shadow-sm uppercase tracking-wider">
                <Sparkles className="w-2.5 h-2.5 fill-slate-950" />
                {t.card.newToday || (language === 'es' ? '¡NUEVO HOY!' : 'NEW TODAY')}
              </span>
            )}

            {isCondominio && (
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-indigo-950/70 border border-indigo-500/40 text-indigo-300">
                {language === 'es' ? 'Condominio' : 'Condo'}
              </span>
            )}
          </div>

          {/* Location (District, Canton, Province) */}
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">
                {auction.district ? `${auction.district}, ` : ''}{auction.canton}
              </span>
            </h3>
            <p className="text-xs text-slate-400 pl-5 font-medium">
              {auction.province}, Costa Rica
            </p>
          </div>

          {/* Folio Real, Docket (Expediente) & Plaintiff (Bank) */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 pt-0.5">
            <span className="font-mono text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
              Folio: <strong className="text-slate-200">{auction.folio_real}</strong>
            </span>
            <span className="font-mono text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
              Exp: <strong className="text-slate-200">{auction.expediente_number}</strong>
            </span>
            {auction.plaintiff && (
              <span className="text-[11px] text-slate-400 truncate max-w-[240px]" title={auction.plaintiff}>
                <strong className="text-slate-500">Actor:</strong> {auction.plaintiff}
              </span>
            )}
          </div>
        </div>

        {/* ================= COLUMN 2: LEGAL BADGES, ALPHA & PHYSICAL SPECS ================= */}
        <div className="lg:w-[28%] space-y-2.5 lg:border-l lg:border-slate-800/80 lg:pl-6">
          {/* Alpha Rating & Security Tier */}
          <div className="flex flex-wrap items-center gap-1.5">
            <DealAlphaBadge auction={auction} language={language} size="sm" showTitleTier={true} />
          </div>

          {/* Legal Specs Chips (Priority, Road Frontage, Construction) */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Mortgage Priority */}
            <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-400 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
              {priority === '1st_mortgage' ? (
                <>
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>1° Hipoteca</span>
                </>
              ) : priority === 'embargo_judicial' ? (
                <>
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  <span>Embargo</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3 h-3 text-amber-400" />
                  <span>2° Hipoteca</span>
                </>
              )}
            </span>

            {/* Road Access */}
            {hasPublicRoad ? (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-sky-950/60 border border-sky-600/40 text-sky-300">
                <Compass className="w-3 h-3 text-sky-400" />
                <span>{language === 'en' ? 'Public Road' : 'Frente a Calle'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-400">
                <span>{language === 'en' ? 'Private Access' : 'Servidumbre'}</span>
              </span>
            )}

            {/* Construction Status */}
            {hasConstruction ? (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-600/40 text-amber-300">
                <Building className="w-3 h-3 text-amber-400" />
                <span>{language === 'en' ? 'Built' : 'Con Mejoras'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-600/40 text-emerald-300">
                <TreePine className="w-3 h-3 text-emerald-400" />
                <span>{language === 'en' ? 'Land' : 'Sin Construir'}</span>
              </span>
            )}
          </div>

          {/* Area & Price / m² */}
          <div className="flex items-center gap-3 text-xs pt-0.5">
            <div className="flex items-center gap-1 text-slate-300 font-mono">
              <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatArea(auction.area_m2)}</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="text-slate-300 font-mono">
              <span className="text-slate-400">{t.card.pricePerM2}: </span>
              <strong>{formatCurrency(metrics.pricePerM2, auction.currency)}</strong>
            </div>
          </div>
        </div>

        {/* ================= COLUMN 3: FINANCIALS, STAGE & DISCOUNT ================= */}
        <div className="lg:w-[22%] space-y-1.5 lg:border-l lg:border-slate-800/80 lg:pl-6">
          {/* Call Progression Stage Pill */}
          <div>
            {liveState.saleStatus === 'in_progress' || countdown.isHearing ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/90 border border-rose-500/60 text-rose-300 font-extrabold text-[10px] uppercase tracking-wider animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                {language === 'es' ? 'En Audiencia' : 'In Hearing'}
              </span>
            ) : liveState.callStage === 'call_3' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 font-extrabold text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {language === 'es' ? '3° Remate (-75%)' : '3rd Call (-75%)'}
              </span>
            ) : liveState.callStage === 'call_2' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-950/90 border border-teal-500/60 text-teal-300 font-extrabold text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                {language === 'es' ? '2° Remate (-25%)' : '2nd Call (-25%)'}
              </span>
            ) : liveState.callStage === 'passed_call_3' || liveState.saleStatus === 'deserted' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300 font-bold text-[10px]">
                {language === 'es' ? '3° Remate Vencido' : '3rd Call Expired'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 font-bold text-[10px]">
                {language === 'es' ? '1° Remate (Base)' : '1st Call (Base)'}
              </span>
            )}
          </div>

          {/* Current Active Base Price */}
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              {liveState.currentCallNumber === 3
                ? 'Base 3° Remate'
                : liveState.currentCallNumber === 2
                ? 'Base 2° Remate'
                : 'Precio Base'}
            </span>
            <p className="text-xl sm:text-2xl font-black text-emerald-400 font-mono tracking-tight">
              {formatCurrency(liveState.currentBasePrice, auction.currency)}
            </p>
          </div>

          {/* Market Value & Discount Margin */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {auction.estimated_market_value && (
              <span className="text-slate-400 line-through text-[11px]">
                {formatCurrency(auction.estimated_market_value, auction.currency)}
              </span>
            )}
            {marginPct > 0 && (
              <span className={`px-2 py-0.5 text-[10.5px] font-black rounded-md border shadow-sm ${marginBadgeClass}`}>
                +{marginPct}% {t.card.estimatedMargin}
              </span>
            )}
          </div>
        </div>

        {/* ================= COLUMN 4: AUCTION DATE, BOOKMARK & ACTION BUTTON ================= */}
        <div className="lg:w-[20%] flex flex-col justify-between gap-3 lg:border-l lg:border-slate-800/80 lg:pl-6 pt-3 lg:pt-0 border-t border-slate-800/60 lg:border-t-0">
          {/* Auction Hearing Date & Relative Countdown */}
          <div className="flex items-center justify-between lg:flex-col lg:items-start gap-1">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <Calendar className={`w-3.5 h-3.5 ${countdown.isHearing ? 'text-rose-400 animate-spin' : countdown.days >= 0 && countdown.days <= 7 ? 'text-amber-400 animate-bounce' : 'text-slate-400'}`} />
              <span className={countdown.isHearing ? 'text-rose-300 font-extrabold' : countdown.days >= 0 && countdown.days <= 7 ? 'text-amber-400' : 'text-slate-300'}>
                {countdown.label}
              </span>
            </div>

            {/* Bookmark button */}
            <button
              type="button"
              onClick={handleToggleSave}
              title={isSaved ? t.card.bookmarkAdded : t.card.bookmarkRemoved}
              className={`p-1.5 rounded-lg border transition-all ${
                isSaved
                  ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md scale-105'
                  : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Direct Details Action Button */}
          <Link
            href={`/auctions/${auction.id}`}
            className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-950/40 hover:shadow-emerald-900/60 transition-all hover:translate-x-0.5 text-center shrink-0"
          >
            <span>{t.card.viewDossier}</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  );
}
