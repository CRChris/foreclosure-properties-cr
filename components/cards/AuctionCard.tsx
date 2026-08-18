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
import { PropertyTypeBanner } from '@/components/ui/PropertyTypeIcon';
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
} from 'lucide-react';

interface AuctionCardProps {
  auction: Auction;
  isSelected?: boolean;
  onSelect?: (auction: Auction) => void;
  compact?: boolean;
}

export function AuctionCard({
  auction,
  isSelected = false,
  onSelect,
  compact = false,
}: AuctionCardProps) {
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

  // Use robust deterministic characteristics detector
  const {
    propertyType,
    hasConstruction,
    hasPublicRoad,
    isCondominio,
    mortgagePriority: priority,
  } = detectPropertyCharacteristics(auction);

  // Margin badge color
  let marginBadgeClass = 'bg-sky-950/90 border-sky-500/40 text-sky-300';
  if (marginPct >= 35) {
    marginBadgeClass = 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300';
  } else if (marginPct >= 20) {
    marginBadgeClass = 'bg-amber-950/90 border-amber-500/50 text-amber-300';
  }

  return (
    <div
      onClick={() => onSelect && onSelect(auction)}
      className={`group relative flex flex-col bg-slate-900/90 border rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer ${
        isSelected
          ? 'border-emerald-500 ring-2 ring-emerald-500/40 shadow-xl shadow-emerald-950/30 bg-slate-900 -translate-y-0.5'
          : 'border-slate-800/90 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-black/40 hover:-translate-y-1'
      }`}
    >
      {/* Icon-Based Category Hero Banner (Zero External Image Dependency) */}
      <div className="relative w-full">
        <PropertyTypeBanner
          type={propertyType}
          language={language}
          canton={auction.canton}
          district={auction.district}
          province={auction.province}
          areaM2={auction.area_m2}
          isCondominio={isCondominio}
          hasConstruction={hasConstruction}
          className="rounded-b-none border-b border-slate-800"
        />

        {/* Floating Badges Overlay (NEW Badge, Discount Margin & Bookmark) */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-20 pointer-events-none">
          <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
            {isNewToday && (
              <span className="px-2.5 py-1 text-[10.5px] font-black rounded-lg bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 text-slate-950 flex items-center gap-1 shadow-lg shadow-emerald-950/60 ring-1 ring-white/40 tracking-wider uppercase">
                <Sparkles className="w-3 h-3 fill-slate-950" />
                {t.card.newToday || (language === 'es' ? '¡NUEVO HOY!' : 'NEW TODAY')}
              </span>
            )}

            {marginPct > 0 ? (
              <span
                className={`px-2.5 py-1 text-xs font-black rounded-lg border backdrop-blur-md flex items-center gap-1 shadow-lg ${marginBadgeClass}`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                +{marginPct}% {t.card.estimatedMargin}
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs font-bold rounded-lg bg-slate-950/80 border border-slate-700 text-slate-300">
                {language === 'es' ? 'Oportunidad' : 'Opportunity'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={handleToggleSave}
              title={isSaved ? t.card.bookmarkAdded : t.card.bookmarkRemoved}
              className={`p-2 rounded-xl backdrop-blur-md border transition-all ${
                isSaved
                  ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg shadow-amber-950/50 scale-105'
                  : 'bg-slate-950/80 text-slate-400 hover:text-white border-slate-700/80 hover:bg-slate-900'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
        <div>
          {/* Call Progression Stage Banner */}
          <div className="pb-2 border-b border-slate-800/70 flex items-center justify-between gap-2">
            {liveState.saleStatus === 'in_progress' || countdown.isHearing ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/90 border border-rose-500/60 text-rose-300 font-extrabold text-[11px] uppercase tracking-wider animate-pulse shadow-md shadow-rose-950/50">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                {language === 'es' ? 'En Audiencia Judicial' : 'In Judicial Hearing'}
              </span>
            ) : liveState.callStage === 'passed_call_3' || liveState.saleStatus === 'deserted' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-300 font-bold text-[10.5px]">
                {language === 'es'
                  ? '3° Remate Vencido • En Proceso de Adjudicación'
                  : '3rd Call Expired • In Adjudication Process'}
              </span>
            ) : liveState.saleStatus === 'suspended' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-950/80 border border-red-500/40 text-red-300 font-bold text-[10.5px]">
                {language === 'es' ? 'Remate Suspendido Judicialmente' : 'Judicially Suspended'}
              </span>
            ) : liveState.saleStatus === 'adjudicated_to_creditor' || liveState.saleStatus === 'adjudicated_to_bidder' || liveState.callStage === 'awarded' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-950/80 border border-purple-500/40 text-purple-300 font-bold text-[10.5px]">
                {language === 'es' ? 'Propiedad Adjudicada' : 'Property Awarded'}
              </span>
            ) : liveState.callStage === 'call_3' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 font-extrabold text-[10.5px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {language === 'es' ? '3° Remate (75% DESCUENTO)' : '3rd Call (75% DISCOUNT)'}
              </span>
            ) : liveState.callStage === 'call_2' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-950/90 border border-teal-500/60 text-teal-300 font-extrabold text-[10.5px]">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                {language === 'es' ? '2° Remate (25% DESCUENTO)' : '2nd Call (25% DISCOUNT)'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-bold text-[10.5px]">
                {language === 'es' ? '1° Remate (100% Base)' : '1st Call (100% Base)'}
              </span>
            )}

            <span className="font-mono text-[10.5px] text-slate-400 font-semibold">
              Folio: {auction.folio_real}
            </span>
          </div>

          {/* Quick Legal Specs Chips (Frontage, Priority & Construction) */}
          <div className="pt-2 flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-[10px] font-sans font-semibold text-emerald-400 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
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

            {hasPublicRoad ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-950/60 border border-sky-600/40 text-sky-300">
                <Compass className="w-3 h-3 text-sky-400" />
                <span>{language === 'en' ? 'Public Road Front' : 'Frente a Calle'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-400">
                <span>{language === 'en' ? 'Private Access' : 'Vía de Servidumbre'}</span>
              </span>
            )}

            {hasConstruction ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-600/40 text-amber-300">
                <Building className="w-3 h-3 text-amber-400" />
                <span>{language === 'en' ? 'Built' : 'Con Mejoras'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-600/40 text-emerald-300">
                <TreePine className="w-3 h-3 text-emerald-400" />
                <span>{language === 'en' ? 'Unbuilt Land' : 'Sin Construir'}</span>
              </span>
            )}
          </div>

          {/* Base Price & Valuation */}
          <div className="pt-2.5 flex items-baseline justify-between gap-2">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                {liveState.currentCallNumber === 3
                  ? '3° Remate (-75%)'
                  : liveState.currentCallNumber === 2
                  ? '2° Remate (-25%)'
                  : `${t.card.firstCall} (Base)`}
              </p>
              <p className="text-xl font-extrabold tracking-tight text-emerald-400">
                {formatCurrency(liveState.currentBasePrice, auction.currency)}
              </p>
            </div>
            {auction.estimated_market_value && (
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {t.card.marketValue}
                </p>
                <p className="text-xs font-bold text-slate-400 line-through">
                  {formatCurrency(auction.estimated_market_value, auction.currency)}
                </p>
              </div>
            )}
          </div>

          {/* Key Metrics: Area & Price/m² */}
          <div className="grid grid-cols-2 gap-2 pt-2.5">
            <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block font-medium">
                {t.card.area}
              </span>
              <span className="text-xs font-bold text-slate-200 font-mono">
                {formatArea(auction.area_m2)}
              </span>
            </div>
            <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block font-medium">
                Precio {t.card.pricePerM2}
              </span>
              <span className="text-xs font-bold text-slate-200 font-mono">
                {formatCurrency(metrics.pricePerM2, auction.currency)}
              </span>
            </div>
          </div>

          {/* Legal Case info */}
          <div className="pt-2.5 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-mono">{t.card.docket}: {auction.expediente_number}</span>
              <span className="truncate max-w-[140px] text-slate-300 font-medium" title={auction.plaintiff}>
                {auction.plaintiff}
              </span>
            </div>
          </div>
        </div>

        {/* Card Footer Strip */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
          {/* Relative countdown chip */}
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <Calendar className={`w-3.5 h-3.5 ${countdown.isHearing ? 'text-rose-400 animate-spin' : countdown.days >= 0 && countdown.days <= 7 ? 'text-amber-400 animate-bounce' : 'text-slate-400'}`} />
            <span className={countdown.isHearing ? 'text-rose-300 font-extrabold' : countdown.days >= 0 && countdown.days <= 7 ? 'text-amber-400' : 'text-slate-300'}>
              {countdown.label}
            </span>
          </div>

          {/* Action Link */}
          <Link
            href={`/auctions/${auction.id}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 group-hover:translate-x-0.5 transition-all bg-emerald-950/40 hover:bg-emerald-900/60 px-2.5 py-1.5 rounded-lg border border-emerald-800/50"
          >
            <span>{t.card.viewDossier}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

