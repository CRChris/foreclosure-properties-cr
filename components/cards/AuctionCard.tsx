'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Auction } from '@/lib/types/auction';
import { formatCurrency, formatArea, formatDateCR, getDaysUntilAuction, calculateInvestorMetrics } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import {
  Calendar,
  MapPin,
  Scale,
  TrendingUp,
  Maximize2,
  Bookmark,
  ArrowRight,
  Sparkles,
  Building,
  Home,
  Trees,
  Warehouse,
  Briefcase,
  ChevronRight,
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
  const [isSaved, setIsSaved] = useState(false);

  // Initialize saved state from localStorage if available
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

  const countdown = getDaysUntilAuction(auction.auction_date_call_1);
  const metrics = calculateInvestorMetrics(auction, 1);
  const primaryImage =
    auction.images?.[0] ||
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80';

  const marginPct = auction.estimated_margin_pct || 0;

  // Margin badge color
  let marginBadgeClass = 'bg-sky-950/90 border-sky-500/40 text-sky-300';
  if (marginPct >= 35) {
    marginBadgeClass = 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300';
  } else if (marginPct >= 20) {
    marginBadgeClass = 'bg-amber-950/90 border-amber-500/50 text-amber-300';
  }

  // Category Icon helper
  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'Condo':
        return <Building className="w-3 h-3 text-emerald-400" />;
      case 'Residential':
      case 'Luxury Estate':
        return <Home className="w-3 h-3 text-emerald-400" />;
      case 'Land/Development':
      case 'Agricultural':
        return <Trees className="w-3 h-3 text-emerald-400" />;
      case 'Industrial':
        return <Warehouse className="w-3 h-3 text-emerald-400" />;
      default:
        return <Briefcase className="w-3 h-3 text-emerald-400" />;
    }
  };

  return (
    <div
      onClick={() => onSelect && onSelect(auction)}
      className={`group relative flex flex-col bg-slate-900/90 border rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer ${
        isSelected
          ? 'border-emerald-500 ring-2 ring-emerald-500/40 shadow-xl shadow-emerald-950/30 bg-slate-900 -translate-y-0.5'
          : 'border-slate-800/90 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-black/40 hover:-translate-y-1'
      }`}
    >
      {/* Property Image Header */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950">
        <img
          src={primaryImage}
          alt={`Remate judicial en ${auction.canton}, ${auction.province}`}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/30 to-transparent" />

        {/* Top Badges & Bookmark */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-1.5">
            {marginPct > 0 ? (
              <span
                className={`px-2.5 py-1 text-xs font-black rounded-lg border backdrop-blur-md flex items-center gap-1 shadow-lg ${marginBadgeClass}`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                +{marginPct}% Margen Est.
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs font-bold rounded-lg bg-slate-950/80 border border-slate-700 text-slate-300">
                Oportunidad
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Bookmark toggle */}
            <button
              type="button"
              onClick={handleToggleSave}
              title={isSaved ? 'Guardado en Favoritos' : 'Guardar propiedad'}
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

        {/* Bottom Tag over Image */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between z-10">
          <span className="text-xs font-semibold text-slate-200 flex items-center gap-1 drop-shadow-md">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate max-w-[170px] sm:max-w-[200px]">
              {auction.district}, {auction.canton}
            </span>
          </span>
          <span className="text-[11px] font-bold text-emerald-400 bg-slate-950/85 px-2 py-0.5 rounded-md border border-slate-800 shadow">
            {auction.province}
          </span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
        <div>
          {/* Header Tag / Folio & Category */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-slate-800/70 font-mono">
            <span className="flex items-center gap-1 text-slate-300">
              {getCategoryIcon(auction.property_category)}
              <span className="font-sans font-medium">{auction.property_category || 'Inmueble'}</span>
            </span>
            <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
              Folio: {auction.folio_real}
            </span>
          </div>

          {/* Base Price & Valuation */}
          <div className="pt-2.5 flex items-baseline justify-between gap-2">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                1er Remate (Base)
              </p>
              <p className="text-xl font-extrabold tracking-tight text-white">
                {formatCurrency(auction.base_price_call_1, auction.currency)}
              </p>
            </div>
            {auction.estimated_market_value && (
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Valor Mercado Est.
                </p>
                <p className="text-xs font-bold text-slate-400 line-through">
                  {formatCurrency(auction.estimated_market_value, auction.currency)}
                </p>
              </div>
            )}
          </div>

          {/* Area & Calculated Price/m² */}
          <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Maximize2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>{formatArea(auction.area_m2)}</span>
            </div>
            <div className="flex items-center justify-end gap-1 text-slate-400 font-mono text-[11px]">
              <span>
                {formatCurrency(metrics.pricePerM2, auction.currency)}/m²
              </span>
            </div>
          </div>

          {/* Legal Expediente */}
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
            <Scale className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate" title={auction.court_name}>
              {auction.expediente_number}
            </span>
          </div>
        </div>

        {/* 3-Call Timeline & Auction Date Indicator */}
        <div className="bg-slate-950/70 rounded-xl p-2.5 border border-slate-800/80 text-[11px] space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5 text-amber-400 font-bold">
              <Calendar className="w-3.5 h-3.5" />
              <span>{countdown.label}</span>
            </span>
            <span className="font-mono text-slate-400">
              {formatDateCR(auction.auction_date_call_1).split(',')[0]}
            </span>
          </div>

          {auction.base_price_call_2 && (
            <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-slate-900 text-[10.5px]">
              <span>2do Remate (-25%):</span>
              <span className="font-mono font-medium text-slate-200">
                {formatCurrency(auction.base_price_call_2, auction.currency)}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="pt-1">
          <Link
            href={`/auctions/${auction.id}`}
            onClick={(e) => e.stopPropagation()}
            className="w-full inline-flex items-center justify-center gap-2 bg-slate-800/90 hover:bg-emerald-600 text-slate-200 hover:text-white text-xs font-bold py-2.5 px-3 rounded-xl border border-slate-700 hover:border-emerald-500 transition-all duration-200 shadow-md group-hover:bg-slate-800"
          >
            <span>Ver Expediente y Avalúo</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
