'use client';

import React, { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Auction } from '@/lib/types/auction';
import { AuctionCallLadder } from '@/components/dossier/AuctionCallLadder';
import { PropertySpecsGrid } from '@/components/dossier/PropertySpecsGrid';
import { InvestmentYieldCalculator } from '@/components/dossier/InvestmentYieldCalculator';
import { DueDiligenceChecklist } from '@/components/dossier/DueDiligenceChecklist';
import { MapWrapper } from '@/components/map/MapWrapper';
import { formatCurrency, formatArea, calculateInvestorMetrics } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { fetchAuctionById } from '@/lib/supabase/db';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { PropertyTypeBadge, inferPropertyType } from '@/components/ui/PropertyTypeIcon';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Scale,
  TrendingUp,
  Maximize2,
  Bookmark,
  Printer,
  Copy,
  Check,
  FileText,
  CalendarPlus,
  Layers,
  AlertTriangle,
  Info,
  Building,
} from 'lucide-react';

interface AuctionDetailPageProps {
  params: {
    id: string;
  };
}

export default function AuctionDetailPage({ params }: AuctionDetailPageProps) {
  const { t, language } = useLanguage();
  const [selectedCall, setSelectedCall] = useState<1 | 2 | 3>(1);
  const [activeEdictTab, setActiveEdictTab] = useState<'summary' | 'raw'>('summary');
  const [copiedEdict, setCopiedEdict] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAuction() {
      setLoading(true);
      try {
        const data = await fetchAuctionById(params.id);
        setAuction(data);
      } catch (err) {
        console.error('Error fetching auction dossier:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAuction();
  }, [params.id]);

  useEffect(() => {
    if (!auction) return;
    try {
      const saved = localStorage.getItem(`saved_auction_${auction.id}`);
      if (saved === 'true') {
        setIsSaved(true);
      }
    } catch {
      // ignore
    }
  }, [auction]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">
          {language === 'es'
            ? 'Cargando expediente judicial...'
            : 'Loading judicial foreclosure docket...'}
        </p>
      </div>
    );
  }

  if (!auction) {
    return notFound();
  }

  const handleToggleSave = () => {
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    try {
      localStorage.setItem(`saved_auction_${auction.id}`, String(nextSaved));
    } catch {
      // ignore
    }
  };

  const handleCopyRawEdict = () => {
    if (!auction.raw_edict_text) return;
    navigator.clipboard.writeText(auction.raw_edict_text);
    setCopiedEdict(true);
    setTimeout(() => setCopiedEdict(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  // Google Calendar URL & .ics Generator
  const generateGoogleCalendarUrl = () => {
    const targetDate = new Date(auction.auction_date_call_1);
    const startDateISO = targetDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const endDate = new Date(targetDate.getTime() + 60 * 60 * 1000);
    const endDateISO = endDate.toISOString().replace(/-|:|\.\d\d\d/g, '');

    const title = encodeURIComponent(
      `Remate Judicial: ${auction.expediente_number} (${auction.canton})`
    );
    const details = encodeURIComponent(
      `Remate judicial tramitado en ${auction.court_name}.\nFolio Real: ${auction.folio_real}\nBase 1er Remate: ${auction.currency} ${auction.base_price_call_1}`
    );
    const location = encodeURIComponent(auction.court_name);

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateISO}/${endDateISO}&details=${details}&location=${location}`;
  };

  const handleDownloadICS = () => {
    const targetDate = new Date(auction.auction_date_call_1);
    const startDateISO = targetDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const endDate = new Date(targetDate.getTime() + 60 * 60 * 1000);
    const endDateISO = endDate.toISOString().replace(/-|:|\.\d\d\d/g, '');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//RematesCR//Foreclosure Auction Schedule//ES',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `SUMMARY:Remate Judicial Folio ${auction.folio_real} - ${auction.canton}`,
      `DESCRIPTION:Remate Judicial Exp ${auction.expediente_number}\\nJuzgado: ${auction.court_name}\\nBase: ${auction.currency} ${auction.base_price_call_1}`,
      `LOCATION:${auction.court_name}`,
      `DTSTART:${startDateISO}`,
      `DTEND:${endDateISO}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `remate_${auction.folio_real}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const marginPct = auction.estimated_margin_pct || 0;
  const propertyType =
    auction.property_type ||
    inferPropertyType(
      `${auction.address_description || ''} ${auction.legal_summary || ''} ${auction.raw_edict_text || ''}`
    );

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Top Breadcrumb & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <Link
          href="/auctions"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.dossier.backToCatalog}</span>
        </Link>

        {/* Quick Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Watchlist Bookmark */}
          <button
            type="button"
            onClick={handleToggleSave}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              isSaved
                ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
            <span>{isSaved ? t.dossier.savedToWatchlist : t.dossier.saveToWatchlist}</span>
          </button>

          {/* Add to Calendar */}
          <a
            href={generateGoogleCalendarUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition-all hover:text-emerald-400"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Google Calendar</span>
          </a>

          {/* Download ICS */}
          <button
            type="button"
            onClick={handleDownloadICS}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition-all"
            title="Download iCal (.ics) for Apple Calendar / Outlook"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>.iCal</span>
          </button>

          {/* Print / Export to PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition-all hover:text-white"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t.dossier.exportPDF}</span>
          </button>
        </div>
      </div>

      {/* Executive Judicial Dossier Hero Banner (Zero External Photo Dependency) */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 border border-slate-800 p-6 sm:p-10 shadow-2xl space-y-6">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <PropertyTypeBadge type={propertyType} language={language} size="lg" />
            <span className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono font-bold">
              Folio Real: {auction.folio_real}
            </span>
            <span className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 text-xs font-mono">
              Exp: {auction.expediente_number}
            </span>
          </div>

          {marginPct > 0 && (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black text-sm shadow-xl self-start md:self-auto">
              <TrendingUp className="w-4 h-4" />
              +{marginPct}% {t.card.estimatedMargin}
            </span>
          )}
        </div>

        <div className="relative z-10 space-y-3">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            {auction.address_description || `${auction.district}, ${auction.canton}`}
          </h1>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-300 pt-1">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {auction.district}, {auction.canton}, {auction.province}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <Maximize2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{formatArea(auction.area_m2)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{auction.court_name}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Primary 3-Call Statutory Ladder Section */}
      <AuctionCallLadder
        auction={auction}
        selectedCall={selectedCall}
        onSelectCall={setSelectedCall}
      />

      {/* Detailed Property Characteristics & 4-Quadrant Linderos */}
      <PropertySpecsGrid auction={auction} />

      {/* Tabbed Legal Text / Executive Summary Dossier */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              {t.dossier.courtNotice}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switchers */}
            <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveEdictTab('summary')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeEdictTab === 'summary'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.dossier.executiveSummaryTab}
              </button>
              <button
                type="button"
                onClick={() => setActiveEdictTab('raw')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeEdictTab === 'raw'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.dossier.rawEdictTab}
              </button>
            </div>

            {/* Copy Button */}
            {activeEdictTab === 'raw' && (
              <button
                type="button"
                onClick={handleCopyRawEdict}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-emerald-400 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800"
              >
                {copiedEdict ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">{t.dossier.copied}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t.dossier.copyRawEdict}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Executive Summary */}
        {activeEdictTab === 'summary' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Legal Summary Prose */}
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800/80 text-sm text-slate-300 leading-relaxed space-y-2">
              <p>
                {auction.legal_summary ||
                  `Remate judicial tramitado ante ${auction.court_name} en el expediente ${auction.expediente_number}, promovido por ${auction.plaintiff}${
                    auction.defendant ? ` contra ${auction.defendant}` : ''
                  }. Se somete a subasta pública la finca del partido de ${auction.province}, matrícula ${auction.folio_real}, plano catastrado ${auction.plano_catastrado || 'N/A'}, con una medida superficial de ${formatArea(auction.area_m2)}.`}
              </p>
            </div>

            {/* Cadastral Specs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-bold block">
                  {t.dossier.folioReal}
                </span>
                <span className="text-sm font-extrabold text-white font-mono mt-1 block">
                  {auction.folio_real}
                </span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-bold block">
                  {t.dossier.planoCatastrado}
                </span>
                <span className="text-sm font-extrabold text-white font-mono mt-1 block">
                  {auction.plano_catastrado || 'En trámite'}
                </span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-bold block">
                  {t.dossier.plaintiff}
                </span>
                <span className="text-xs font-bold text-slate-200 mt-1 block truncate">
                  {auction.plaintiff}
                </span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-bold block">
                  {t.dossier.surfaceArea}
                </span>
                <span className="text-sm font-extrabold text-emerald-400 font-mono mt-1 block">
                  {formatArea(auction.area_m2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Raw Edict Text */}
        {activeEdictTab === 'raw' && (
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 max-h-96 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap selection:bg-emerald-500/40">
            {auction.raw_edict_text || 'Texto del edicto judicial no disponible.'}
          </div>
        )}
      </div>

      {/* Statutory Closing Costs & Investment Yield Calculator */}
      <InvestmentYieldCalculator
        auction={auction}
        selectedCall={selectedCall}
      />

      {/* Due Diligence Legal Checklist */}
      <DueDiligenceChecklist auction={auction} />

      {/* Geospatial Map Section with Prominent Centroid Warning */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              {t.dossier.geographicLocation}
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {auction.latitude?.toFixed(4)}, {auction.longitude?.toFixed(4)}
          </span>
        </div>

        {/* Persistent Map Centroid Disclaimer */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200/90 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            {language === 'en'
              ? '📍 Approximate location by district centroid. Judicial foreclosure notices do not contain precise GPS coordinates. Consult the official registered cadastral survey (Plano Catastrado) for exact boundaries.'
              : '📍 Ubicación aproximada por centroide distrital. Los remates judiciales no incluyen coordenadas GPS exactas en el edicto. Verifique el plano catastrado oficial para linderos definitivos.'}
          </p>
        </div>

        <div className="h-80 w-full rounded-2xl overflow-hidden border border-slate-800">
          <MapWrapper
            auctions={[auction]}
            selectedAuctionId={auction.id}
            center={
              auction.latitude && auction.longitude
                ? [auction.latitude, auction.longitude]
                : [9.7489, -83.7534]
            }
            zoom={14}
            height="100%"
          />
        </div>
      </div>
    </div>
  );
}
