'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MOCK_AUCTIONS } from '@/lib/mock-data';
import { Auction } from '@/lib/types/auction';
import {
  formatCurrency,
  formatArea,
  formatDateCR,
  getDaysUntilAuction,
  calculateInvestorMetrics,
} from '@/lib/utils';
import { MapWrapper } from '@/components/map/MapWrapper';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AuctionCallLadder } from '@/components/dossier/AuctionCallLadder';
import { InvestmentYieldCalculator } from '@/components/dossier/InvestmentYieldCalculator';
import { DueDiligenceChecklist } from '@/components/dossier/DueDiligenceChecklist';
import {
  ArrowLeft,
  Calendar,
  CalendarPlus,
  Scale,
  MapPin,
  Maximize2,
  TrendingUp,
  DollarSign,
  FileText,
  Copy,
  Check,
  Building2,
  ShieldCheck,
  Percent,
  Calculator,
  Compass,
  Bookmark,
  Printer,
  Sparkles,
  Share2,
  Landmark,
  ExternalLink,
  Layers,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

import { fetchAuctionById } from '@/lib/supabase/db';

interface AuctionDetailPageProps {
  params: {
    id: string;
  };
}

export default function AuctionDetailPage({ params }: AuctionDetailPageProps) {
  const [selectedCall, setSelectedCall] = useState<1 | 2 | 3>(1);
  const [activeEdictTab, setActiveEdictTab] = useState<'summary' | 'raw'>('summary');
  const [copiedEdict, setCopiedEdict] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(
    !MOCK_AUCTIONS.some((a) => a.id === params.id)
  );
  const [auction, setAuction] = useState<Auction | null>(
    MOCK_AUCTIONS.find((a) => a.id === params.id) || null
  );

  // Fetch live auction if Supabase is active
  useEffect(() => {
    fetchAuctionById(params.id).then((data) => {
      if (data) {
        setAuction(data);
      }
      setLoading(false);
    });
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">Cargando expediente judicial...</p>
      </div>
    );
  }

  if (!auction) {
    return notFound();
  }

  // Check saved state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`saved_auction_${auction.id}`);
      if (saved === 'true') {
        setIsSaved(true);
      }
    } catch {
      // ignore
    }
  }, [auction.id]);

  const handleToggleSave = () => {
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    try {
      localStorage.setItem(`saved_auction_${auction.id}`, String(nextSaved));
    } catch {
      // ignore
    }
  };

  const handleCopyEdict = () => {
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
    const endDate = new Date(targetDate.getTime() + 60 * 60 * 1000); // 1 hour duration
    const endDateISO = endDate.toISOString().replace(/-|:|\.\d\d\d/g, '');

    const title = encodeURIComponent(
      `Remate Judicial: Folio ${auction.folio_real} (${auction.canton})`
    );
    const details = encodeURIComponent(
      `Remate Judicial 1er Señalamiento\nExpediente: ${auction.expediente_number}\nJuzgado: ${auction.court_name}\nBase: ${formatCurrency(auction.base_price_call_1, auction.currency)}\nFolio Real: ${auction.folio_real}\nUbicación: ${auction.district}, ${auction.canton}, ${auction.province}`
    );
    const location = encodeURIComponent(`${auction.court_name}, Costa Rica`);

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

  const primaryImage =
    auction.images?.[0] ||
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80';

  const marginPct = auction.estimated_margin_pct || 0;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Top Breadcrumb & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <Link
          href="/auctions"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Catálogo y Mapa</span>
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
            <span>{isSaved ? 'En Favoritos' : 'Guardar Inmueble'}</span>
          </button>

          {/* Add to Calendar */}
          <a
            href={generateGoogleCalendarUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition-all hover:text-emerald-400"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Añadir a Google Calendar</span>
          </a>

          {/* Download ICS */}
          <button
            type="button"
            onClick={handleDownloadICS}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition-all"
            title="Descargar archivo iCalendar (.ics) para Apple Calendar / Outlook"
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
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* Hero Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl">
        <div className="h-72 sm:h-96 w-full relative">
          <img
            src={primaryImage}
            alt={auction.court_name}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

          {/* Badges on hero top */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 z-10">
            <div className="flex flex-wrap items-center gap-2">
              {marginPct > 0 && (
                <span className="px-3 py-1 text-xs font-black rounded-xl bg-emerald-950/95 border border-emerald-500/60 text-emerald-300 backdrop-blur-md flex items-center gap-1.5 shadow-xl">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  +{marginPct}% Margen de Oportunidad
                </span>
              )}
              <span className="px-2.5 py-1 text-xs font-bold rounded-xl bg-slate-950/90 border border-slate-700 text-slate-200 backdrop-blur-md">
                {auction.property_category || 'Inmueble'}
              </span>
            </div>

            <span className="px-3 py-1 text-xs font-mono font-bold rounded-xl bg-slate-950/90 text-emerald-400 border border-emerald-500/40">
              {auction.currency}
            </span>
          </div>
        </div>

        {/* Hero Bottom Info Overlay */}
        <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row md:items-end justify-between gap-6 z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                <MapPin className="w-4 h-4" />
                {auction.district}, {auction.canton}, {auction.province}
              </span>
              <span>•</span>
              <span className="font-mono bg-slate-950/90 px-2.5 py-0.5 rounded-lg border border-slate-700 font-bold">
                Folio Real: {auction.folio_real}
              </span>
              {auction.plano_catastrado && (
                <span className="font-mono bg-slate-950/90 px-2.5 py-0.5 rounded-lg border border-slate-700 font-bold">
                  Plano: {auction.plano_catastrado}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              {auction.address_description || `Remate Judicial en ${auction.canton}`}
            </h1>

            <p className="text-xs text-slate-300 flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {auction.court_name} • Expediente: <strong className="font-mono text-white">{auction.expediente_number}</strong>
              </span>
            </p>
          </div>

          {/* Pricing Highlight Box */}
          <div className="bg-slate-950/95 p-4 sm:p-5 rounded-2xl border border-slate-800 backdrop-blur-md shrink-0 text-right space-y-1 shadow-2xl">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Base 1er Remate (100%)
            </p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight font-mono">
              {formatCurrency(auction.base_price_call_1, auction.currency)}
            </p>
            {auction.estimated_market_value && (
              <p className="text-xs text-slate-400 font-medium">
                Avalúo Comercial: {formatCurrency(auction.estimated_market_value, auction.currency)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Cadastral & Property Specifications Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
            Área de Terreno
          </p>
          <p className="text-base sm:text-lg font-bold text-white font-mono">
            {formatArea(auction.area_m2)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            Plano Catastrado
          </p>
          <p className="text-base sm:text-lg font-bold text-slate-200 font-mono">
            {auction.plano_catastrado || 'En trámite'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Landmark className="w-3.5 h-3.5 text-slate-500" />
            Acreedor Ejecutante
          </p>
          <p className="text-xs sm:text-sm font-bold text-slate-200 truncate" title={auction.plaintiff}>
            {auction.plaintiff}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            Tipo de Propiedad
          </p>
          <p className="text-xs sm:text-sm font-bold text-emerald-400">
            {auction.property_category || 'Inmueble'}
          </p>
        </div>
      </div>

      {/* 1. AUCTION CALL LADDER COMPONENT */}
      <AuctionCallLadder
        auction={auction}
        selectedCall={selectedCall}
        onSelectCall={setSelectedCall}
      />

      {/* 2. REAL ESTATE YIELD & STATUTORY TAX CALCULATOR */}
      <InvestmentYieldCalculator
        auction={auction}
        selectedCall={selectedCall}
      />

      {/* 3. LEGAL RISK & DUE DILIGENCE CHECKLIST */}
      <DueDiligenceChecklist auction={auction} />

      {/* 4. LEGAL EDICT ANALYSIS & PARCEL PINPOINT MAP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Legal Edict Tabs */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white tracking-tight">
                Análisis del Edicto Legal Judicial
              </h3>
            </div>

            {/* Tab switch */}
            <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveEdictTab('summary')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  activeEdictTab === 'summary'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Resumen Ejecutivo
              </button>
              <button
                type="button"
                onClick={() => setActiveEdictTab('raw')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  activeEdictTab === 'raw'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Texto Íntegro (Boletín)
              </button>
            </div>
          </div>

          {activeEdictTab === 'summary' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Dictamen y Características Extraídas:
                </p>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {auction.legal_summary ||
                    'Inmueble sacado a remate judicial en cumplimiento de orden emanada por el despacho judicial competente en proceso de ejecución hipotecaria.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 font-medium">Acreedor Hipotecario:</span>
                  <p className="font-bold text-white">{auction.plaintiff}</p>
                </div>
                <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 font-medium">Parte Demandada:</span>
                  <p className="font-bold text-white">{auction.defendant || 'No disponible'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Publicación oficial en el Boletín Judicial de Costa Rica:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyEdict}
                  className="text-xs h-7 px-2.5"
                >
                  {copiedEdict ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400 mr-1.5" />
                      Copiado al portapapeles
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 mr-1.5" />
                      Copiar Edicto
                    </>
                  )}
                </Button>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap select-text">
                {auction.raw_edict_text}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Interactive Parcel Pinpoint Map */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white tracking-tight">
                Geolocalización PostGIS
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {auction.latitude?.toFixed(4)}, {auction.longitude?.toFixed(4)}
            </span>
          </div>

          <div className="h-64 rounded-xl overflow-hidden border border-slate-800 relative">
            <MapWrapper
              auctions={[auction]}
              selectedAuctionId={auction.id}
              center={
                auction.latitude && auction.longitude
                  ? [auction.latitude, auction.longitude]
                  : undefined
              }
              zoom={14}
              height="100%"
            />
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <span>Ubicación: <strong>{auction.canton}, {auction.province}</strong></span>
            <Link
              href="/map"
              className="text-emerald-400 hover:text-emerald-300 font-bold inline-flex items-center gap-1"
            >
              <span>Ver en Mapa Completo</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
