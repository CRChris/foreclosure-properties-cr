'use client';

import React, { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Auction, SubPropertyParcel } from '@/lib/types/auction';
import { AuctionCallLadder } from '@/components/dossier/AuctionCallLadder';
import { PropertySpecsGrid } from '@/components/dossier/PropertySpecsGrid';
import { CourtAccessCard } from '@/components/dossier/CourtAccessCard';
import { InvestmentYieldCalculator } from '@/components/dossier/InvestmentYieldCalculator';
import { DueDiligenceChecklist } from '@/components/dossier/DueDiligenceChecklist';
import { OpportunityMatrixCard } from '@/components/dossier/OpportunityMatrixCard';
import { ParticipateAuctionModal } from '@/components/dossier/ParticipateAuctionModal';
import { PortfolioPropertySelector } from '@/components/dossier/PortfolioPropertySelector';
import { DealAlphaBadge } from '@/components/ui/DealAlphaBadge';
import { CadastralLocationBadge } from '@/components/ui/CadastralLocationBadge';
import { MapWrapper } from '@/components/map/MapWrapper';
import { COSTA_RICA_CENTER } from '@/components/map/mapConstants';
import {
  formatCurrency,
  formatArea,
  calculateInvestorMetrics,
  detectPropertyCharacteristics,
  getLocalizedPropertyTitle,
  getLiveAuctionProgressionState,
  formatDateAdded,
  isPropertyNewToday,
} from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { fetchAuctionById } from '@/lib/supabase/db';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { PropertyTypeBadge } from '@/components/ui/PropertyTypeIcon';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Sparkles,
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
  ExternalLink,
  Gavel,
  Target,
  Navigation,
  Loader2,
  Share2,
  Package,
  Globe,
} from 'lucide-react';

interface AuctionDetailPageProps {
  params: {
    id: string;
  };
}

export default function AuctionDetailPage({ params }: AuctionDetailPageProps) {
  const { t, language } = useLanguage();
  const [selectedCall, setSelectedCall] = useState<1 | 2 | 3 | null>(null);
  const [selectedSubParcelIndex, setSelectedSubParcelIndex] = useState<number | null>(null);
  const [activeEdictTab, setActiveEdictTab] = useState<'summary' | 'raw'>('summary');
  const [copiedEdict, setCopiedEdict] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isParticipateModalOpen, setIsParticipateModalOpen] = useState(false);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAuction() {
      setLoading(true);
      try {
        const data = await fetchAuctionById(params.id);
        if (data) {
          setAuction(data);
          const live = getLiveAuctionProgressionState(data);
          if (live.currentCallNumber) {
            setSelectedCall(live.currentCallNumber);
          } else {
            setSelectedCall(null);
          }
        }
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {language === 'es' ? 'Cargando expediente judicial...' : 'Loading foreclosure dossier...'}
          </p>
        </div>
      </div>
    );
  }

  if (!auction) {
    return notFound();
  }

  const handleToggleSave = () => {
    const next = !isSaved;
    setIsSaved(next);
    try {
      localStorage.setItem(`saved_auction_${auction.id}`, String(next));
    } catch {
      // ignore
    }
  };

  const handleCopyRawEdict = () => {
    if (auction.raw_edict_text) {
      navigator.clipboard.writeText(auction.raw_edict_text);
      setCopiedEdict(true);
      setTimeout(() => setCopiedEdict(false), 2500);
    }
  };

  const handleShare = async () => {
    if (!auction) return;
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const shareData = {
      title: `Remate Judicial - ${auction.canton} (${auction.folio_real})`,
      text: `${getLocalizedPropertyTitle(auction, language)} | Expediente: ${auction.expediente_number}`,
      url: shareUrl,
    };

    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    if (typeof window !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2500);
      } catch (e) {
        console.error('Failed to copy to clipboard', e);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

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
      'PRODID:-//REmatrixCR//Foreclosure Auction Schedule//ES',
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
  const isNewToday = isPropertyNewToday(auction.created_at);
  const { propertyType } = detectPropertyCharacteristics(auction);

  const isPortfolio = Boolean(auction.is_portfolio_auction) && Boolean(auction.sub_properties && auction.sub_properties.length > 1);
  const activeSubProperty: SubPropertyParcel | null = isPortfolio && selectedSubParcelIndex !== null
    ? (auction.sub_properties?.find((sp) => sp.parcel_index === selectedSubParcelIndex) || null)
    : null;

  const provincesSpanned = isPortfolio
    ? Array.from(new Set(auction.sub_properties!.map((p) => p.province))).join(' • ')
    : `${auction.district ? `${auction.district}, ` : ''}${auction.canton}, ${auction.province}`;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Top Breadcrumb & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <Link
          href="/auctions"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.dossier.backToCatalog}</span>
        </Link>

        {/* Quick Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Participate in Auction Primary CTA */}
          <button
            type="button"
            onClick={() => setIsParticipateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-black transition-all shadow-md shadow-emerald-600/20 dark:shadow-emerald-950/60 ring-1 ring-emerald-400/40 hover:scale-[1.02]"
          >
            <Gavel className="w-3.5 h-3.5" />
            <span>{language === 'es' ? 'Participar en este Remate' : 'Participate in this Auction'}</span>
          </button>

          {/* Watchlist Bookmark */}
          <button
            type="button"
            onClick={handleToggleSave}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              isSaved
                ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md'
                : 'bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 shadow-sm'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
            <span>{isSaved ? t.dossier.savedToWatchlist : t.dossier.saveToWatchlist}</span>
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              copiedShare
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 shadow-sm'
                : 'bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 shadow-sm'
            }`}
            title={language === 'es' ? 'Compartir expediente' : 'Share dossier'}
          >
            {copiedShare ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400">{t.dossier.copiedLink}</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>{t.dossier.share}</span>
              </>
            )}
          </button>

          {/* Add to Calendar */}
          <a
            href={generateGoogleCalendarUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-bold transition-all hover:text-emerald-600 dark:hover:text-emerald-400 shadow-sm"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Google Calendar</span>
          </a>

          {/* Download ICS */}
          <button
            type="button"
            onClick={handleDownloadICS}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-bold transition-all shadow-sm"
            title="Download iCal (.ics) for Apple Calendar / Outlook"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>.iCal</span>
          </button>

          {/* Print / Export to PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-bold transition-all hover:text-slate-900 dark:hover:text-white shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t.dossier.exportPDF}</span>
          </button>
        </div>
      </div>

      {/* Executive Judicial Dossier Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950 border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-xl dark:shadow-2xl space-y-6">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000000_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {isNewToday && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-950/30 ring-1 ring-white/40 tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                {t.card.newToday || (language === 'es' ? '¡NUEVO HOY!' : 'NEW TODAY')}
              </span>
            )}
            {isPortfolio ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-xs shadow-md shadow-emerald-950/40 ring-1 ring-white/20">
                <Package className="w-3.5 h-3.5" />
                <span>{language === 'es' ? `Portafolio de ${auction.sub_properties!.length} Inmuebles` : `${auction.sub_properties!.length}-Property Portfolio`}</span>
              </span>
            ) : (
              <PropertyTypeBadge type={propertyType} language={language} size="lg" />
            )}
            <DealAlphaBadge auction={auction} language={language} size="md" />
            <CadastralLocationBadge
              locationType={auction.location_type}
              hasPolygon={!!auction.parcel_polygon}
              language={language}
              size="md"
            />
            <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold">
              {isPortfolio ? `Folios: ${auction.sub_properties!.map(p => p.folio_real).join(', ')}` : `Folio Real: ${auction.folio_real}`}
            </span>
            <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-mono">
              Exp: {auction.expediente_number}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            {marginPct > 0 && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs sm:text-sm shadow-md">
                <TrendingUp className="w-4 h-4" />
                +{marginPct}% {t.card.estimatedMargin}
              </span>
            )}

            <button
              type="button"
              onClick={() => setIsParticipateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/20 dark:shadow-emerald-950/60 transition-all hover:scale-[1.02] ring-1 ring-emerald-400/40"
            >
              <Gavel className="w-4 h-4" />
              <span>{language === 'es' ? 'Participar en este Remate' : 'Participate in this Auction'}</span>
            </button>
          </div>
        </div>

        <div className="relative z-10 space-y-3">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            {isPortfolio
              ? (language === 'es'
                  ? `Portafolio de ${auction.sub_properties!.length} Inmuebles en Remate Único`
                  : `${auction.sub_properties!.length}-Property Portfolio Foreclosure Package`)
              : getLocalizedPropertyTitle(auction, language)}
          </h1>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-1">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{provincesSpanned}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Maximize2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{formatArea(auction.area_m2)} {isPortfolio ? (language === 'es' ? '(Total Combinada)' : '(Total Combined)') : ''}</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                <strong className="text-slate-500 dark:text-slate-400 font-semibold">{t.dossier.dateAdded}:</strong>{' '}
                <span className="text-emerald-700 dark:text-emerald-300 font-semibold">{formatDateAdded(auction.created_at, language)}</span>
              </span>
            </span>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${auction.court_name}, Costa Rica`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-600 dark:text-slate-300 transition-colors group underline decoration-slate-300 dark:decoration-slate-700 hover:decoration-emerald-500 underline-offset-2"
              title={language === 'es' ? 'Ver juzgado en Google Maps (abre en nueva pestaña)' : 'Find auction court on Google Maps (opens in new tab)'}
            >
              <Scale className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
              <span>{auction.court_name}</span>
              <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 ml-0.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Portfolio Sub-Property Interactive Tab Selector (if multi-property auction) */}
      {isPortfolio && auction.sub_properties && (
        <PortfolioPropertySelector
          subProperties={auction.sub_properties}
          selectedParcelIndex={selectedSubParcelIndex}
          onSelectParcel={(idx) => setSelectedSubParcelIndex(idx)}
          language={language}
          totalAreaM2={auction.area_m2}
          currency={auction.currency}
          basePrice={auction.base_price_call_1}
        />
      )}

      {/* Primary 3-Call Statutory Ladder Section */}
      <AuctionCallLadder
        auction={auction}
        selectedCall={selectedCall}
        onSelectCall={setSelectedCall}
        onOpenParticipate={() => setIsParticipateModalOpen(true)}
      />

      {/* Detailed Property Characteristics & 4-Quadrant Linderos */}
      <PropertySpecsGrid
        auction={auction}
        selectedSubProperty={activeSubProperty}
      />

      {/* Official Court Case File & Online Appraisal Access (PIN Request) */}
      <CourtAccessCard
        expediente={auction.expediente_number}
        courtName={auction.court_name}
        fincaNumber={activeSubProperty ? activeSubProperty.folio_real : auction.folio_real}
      />

      {/* Tabbed Legal Text / Executive Summary Dossier */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-md dark:shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              {t.dossier.courtNotice}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switchers */}
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveEdictTab('summary')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeEdictTab === 'summary'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
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
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
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
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              >
                {copiedEdict ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400">{t.dossier.copied}</span>
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
            <div className="p-4 bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800/80 text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-2">
              <p>
                {language === 'en'
                  ? `Judicial foreclosure proceedings before ${auction.court_name} under case docket ${auction.expediente_number}, filed by plaintiff ${auction.plaintiff}${
                      auction.defendant ? ` against ${auction.defendant}` : ''
                    }. Public judicial auction of titled real estate in the province of ${auction.province}, registered under Folio Real ${auction.folio_real}, cadastral survey ${auction.plano_catastrado || 'N/A'}, with an official registered surface area of ${formatArea(auction.area_m2)}.`
                  : auction.legal_summary ||
                    `Remate judicial tramitado ante ${auction.court_name} en el expediente ${auction.expediente_number}, promovido por ${auction.plaintiff}${
                      auction.defendant ? ` contra ${auction.defendant}` : ''
                    }. Se somete a subasta pública la finca del partido de ${auction.province}, matrícula ${auction.folio_real}, plano catastrado ${auction.plano_catastrado || 'N/A'}, con una medida superficial de ${formatArea(auction.area_m2)}.`}
              </p>
            </div>

            {/* Cadastral Specs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-bold block">
                  {t.dossier.folioReal}
                </span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white font-mono mt-1 block">
                  {auction.folio_real}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-bold block">
                  {t.dossier.planoCatastrado}
                </span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white font-mono mt-1 block">
                  {auction.plano_catastrado || 'En trámite'}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-bold block">
                  {t.dossier.plaintiff}
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block truncate">
                  {auction.plaintiff}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-bold block">
                  {t.dossier.surfaceArea}
                </span>
                <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">
                  {formatArea(auction.area_m2)}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-bold block">
                  {t.dossier.dateAdded}
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                  {formatDateAdded(auction.created_at, language)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Raw Edict Text */}
        {activeEdictTab === 'raw' && (
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 max-h-96 overflow-y-auto font-mono text-xs text-slate-800 dark:text-slate-300 leading-relaxed whitespace-pre-wrap selection:bg-emerald-500/40">
            {auction.raw_edict_text || 'Texto del edicto judicial no disponible.'}
          </div>
        )}
      </div>

      {/* Opportunity Alpha & Title Security Matrix */}
      <OpportunityMatrixCard auction={auction} />

      {/* Statutory Closing Costs & Investment Yield Calculator */}
      <InvestmentYieldCalculator
        auction={auction}
        selectedCall={selectedCall}
      />

      {/* Compact In-App Disclaimer Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/40 space-y-2 text-xs">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <p className="font-bold text-amber-950 dark:text-amber-200">
              {t.disclaimer.compact.title}
            </p>
            <p className="text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
              {t.disclaimer.compact.body}
            </p>
            <div className="pt-1">
              <Link
                href="/terms"
                target="_blank"
                className="font-bold text-amber-950 dark:text-amber-200 underline hover:text-emerald-600 dark:hover:text-emerald-400 inline-flex items-center gap-1"
              >
                <span>{t.disclaimer.comprehensive.title}</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Due Diligence Legal Checklist */}
      <DueDiligenceChecklist auction={auction} />

      {/* Geospatial Map Section with Exact Cadastral / Approximate Status & GPS Navigation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-md dark:shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>{t.dossier.geographicLocation}</span>
                {activeSubProperty && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold">
                    #{activeSubProperty.parcel_index}: {activeSubProperty.canton}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeSubProperty 
                  ? `${activeSubProperty.district ? `${activeSubProperty.district}, ` : ''}${activeSubProperty.canton}, ${activeSubProperty.province}`
                  : provincesSpanned}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CadastralLocationBadge
              locationType={activeSubProperty ? activeSubProperty.location_type : auction.location_type}
              hasPolygon={Boolean(activeSubProperty?.parcel_polygon || auction.parcel_polygon)}
              language={language}
              size="sm"
            />
            {(() => {
              const targetLat = activeSubProperty ? activeSubProperty.latitude : auction.latitude;
              const targetLng = activeSubProperty ? activeSubProperty.longitude : auction.longitude;
              if (!targetLat || !targetLng) return null;
              return (
                <div className="flex items-center gap-1.5">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${targetLat},${targetLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs font-bold transition-all shadow-sm hover:text-blue-600 dark:hover:text-blue-400"
                    title="Open exact coordinates in Google Maps"
                  >
                    <MapPin className="w-3.5 h-3.5 text-blue-500" />
                    <span>Google Maps</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>

                  <a
                    href={`https://waze.com/ul?ll=${targetLat},${targetLng}&navigate=yes`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs font-bold transition-all shadow-sm hover:text-sky-600 dark:hover:text-sky-400"
                    title="Navigate with Waze"
                  >
                    <Navigation className="w-3.5 h-3.5 text-sky-500" />
                    <span>Waze</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Dynamic Cadastral Banner (Only displayed when in general vicinity or in-process) */}
        {auction.location_type === 'pending_mapping' ? (
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-500/40 text-sky-900 dark:text-sky-200 text-xs">
            <Loader2 className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5 animate-spin" />
            <div className="space-y-0.5">
              <p className="font-bold">
                {language === 'en' ? '⏳ Map Location in Process' : '⏳ Georreferenciación en Proceso'}
              </p>
              <p className="leading-tight text-sky-800 dark:text-sky-300">
                {language === 'en'
                  ? 'The automated mapping pipeline is currently resolving cadastral survey coordinates for this property.'
                  : 'El motor de georreferenciación se encuentra procesando el plano catastrado y coordenadas para este inmueble.'}
              </p>
            </div>
          </div>
        ) : (!auction.parcel_polygon && auction.location_type !== 'exact_cadastral') ? (
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/40 text-amber-950 dark:text-amber-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">
                {language === 'en' ? '📍 General Vicinity — Exact Location Unknown' : '📍 Zona General — Ubicación Exacta Desconocida'}
              </p>
              <p className="leading-tight text-amber-900/90 dark:text-amber-300/90">
                {language === 'en'
                  ? 'This marker corresponds to the town/district center. The exact property boundary is unknown in the cadastre.'
                  : 'Este marcador corresponde al centroide de la localidad. Los linderos y ubicación física exacta no están disponibles en el catastro.'}
              </p>
            </div>
          </div>
        ) : null}

        <div className="h-80 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
          <MapWrapper
            auctions={[auction]}
            selectedAuctionId={auction.id}
            center={
              activeSubProperty && activeSubProperty.latitude && activeSubProperty.longitude
                ? [activeSubProperty.latitude, activeSubProperty.longitude]
                : auction.latitude && auction.longitude
                ? [auction.latitude, auction.longitude]
                : COSTA_RICA_CENTER
            }
            zoom={
              activeSubProperty
                ? (activeSubProperty.location_type === 'exact_cadastral' ? 16 : 14)
                : (isPortfolio ? 8 : (auction.location_type === 'exact_cadastral' ? 16 : 14))
            }
            height="100%"
          />
        </div>
      </div>

      {/* Property-Specific Participation Modal */}
      <ParticipateAuctionModal
        auction={auction}
        selectedCall={selectedCall}
        isOpen={isParticipateModalOpen}
        onClose={() => setIsParticipateModalOpen(false)}
      />
    </div>
  );
}
