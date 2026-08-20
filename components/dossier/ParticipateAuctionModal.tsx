'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Auction } from '@/lib/types/auction';
import { formatCurrency, formatDateCR, getLocalizedPropertyTitle } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  Gavel,
  Scale,
  X,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Landmark,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Video,
  ExternalLink,
  Copy,
  Check,
  Printer,
  FileText,
  Building,
  CreditCard,
  Smartphone,
  ArrowRight,
  Info,
  Banknote,
} from 'lucide-react';

interface ParticipateAuctionModalProps {
  auction: Auction;
  selectedCall?: (1 | 2 | 3) | null;
  isOpen: boolean;
  onClose: () => void;
}

export interface JudicialBCRAccountInfo {
  circuitName: string;
  circuitNameEn: string;
  despachoCode: string;
  ibanCRC: string;
  ibanUSD: string;
  bcrServiceName: string;
  officialBcrPortalUrl: string;
  officialPoderJudicialUrl: string;
}

/**
 * Deterministic mapping of Costa Rican Courts / Circuits to official BCR Judicial Deposit Accounts
 */
export function getJudicialBCRAccount(courtName?: string | null, province?: string | null): JudicialBCRAccountInfo {
  const courtLower = (courtName || '').toLowerCase();
  const provLower = (province || '').toLowerCase();

  // Segundo Circuito Judicial de San José (Goicoechea / Montelimar / Calle Blancos)
  if (
    courtLower.includes('segundo circuito') ||
    courtLower.includes('ii circuito') ||
    courtLower.includes('goicoechea') ||
    courtLower.includes('montelimar')
  ) {
    return {
      circuitName: 'Segundo Circuito Judicial de San José (Goicoechea / Montelimar)',
      circuitNameEn: 'Second Judicial Circuit of San José (Goicoechea / Montelimar)',
      despachoCode: '1160 (Juzgado 1° y 2° Especializado de Cobro II Circuito)',
      ibanCRC: 'CR34015201001021488102',
      ibanUSD: 'CR88015201001026112902',
      bcrServiceName: 'Poder Judicial - Depósitos Judiciales II Circuito San José',
      officialBcrPortalUrl: 'https://www.bancobcr.com',
      officialPoderJudicialUrl: 'https://pj.poder-judicial.go.cr/',
    };
  }

  // Alajuela
  if (
    provLower.includes('alajuela') ||
    courtLower.includes('alajuela') ||
    courtLower.includes('san ramón') ||
    courtLower.includes('grecia')
  ) {
    return {
      circuitName: 'Circuito Judicial de Alajuela (Tribunales de Alajuela)',
      circuitNameEn: 'Judicial Circuit of Alajuela (Alajuela Courthouses)',
      despachoCode: '1251 (Juzgado Especializado de Cobro de Alajuela)',
      ibanCRC: 'CR19015201001020211502',
      ibanUSD: 'CR65015201001026071402',
      bcrServiceName: 'Poder Judicial - Depósitos Judiciales Alajuela',
      officialBcrPortalUrl: 'https://www.bancobcr.com',
      officialPoderJudicialUrl: 'https://pj.poder-judicial.go.cr/',
    };
  }

  // Heredia
  if (provLower.includes('heredia') || courtLower.includes('heredia')) {
    return {
      circuitName: 'Circuito Judicial de Heredia (Tribunales de Heredia)',
      circuitNameEn: 'Judicial Circuit of Heredia (Heredia Courthouses)',
      despachoCode: '1310 (Juzgado Especializado de Cobro de Heredia)',
      ibanCRC: 'CR72015201001020304202',
      ibanUSD: 'CR12015201001026084002',
      bcrServiceName: 'Poder Judicial - Depósitos Judiciales Heredia',
      officialBcrPortalUrl: 'https://www.bancobcr.com',
      officialPoderJudicialUrl: 'https://pj.poder-judicial.go.cr/',
    };
  }

  // Cartago
  if (provLower.includes('cartago') || courtLower.includes('cartago') || courtLower.includes('la unión')) {
    return {
      circuitName: 'Circuito Judicial de Cartago (Tribunales de Cartago)',
      circuitNameEn: 'Judicial Circuit of Cartago (Cartago Courthouses)',
      despachoCode: '1410 (Juzgado de Cobro de Cartago)',
      ibanCRC: 'CR55015201001020412802',
      ibanUSD: 'CR38015201001026093102',
      bcrServiceName: 'Poder Judicial - Depósitos Judiciales Cartago',
      officialBcrPortalUrl: 'https://www.bancobcr.com',
      officialPoderJudicialUrl: 'https://pj.poder-judicial.go.cr/',
    };
  }

  // Guanacaste (Liberia, Santa Cruz, Nicoya)
  if (
    provLower.includes('guanacaste') ||
    courtLower.includes('liberia') ||
    courtLower.includes('santa cruz') ||
    courtLower.includes('nicoya')
  ) {
    return {
      circuitName: 'Circuito Judicial de Guanacaste (Liberia / Santa Cruz)',
      circuitNameEn: 'Judicial Circuit of Guanacaste (Liberia / Santa Cruz)',
      despachoCode: '1520 (Juzgado de Cobro de Guanacaste)',
      ibanCRC: 'CR41015201001020526002',
      ibanUSD: 'CR91015201001026101202',
      bcrServiceName: 'Poder Judicial - Depósitos Judiciales Guanacaste',
      officialBcrPortalUrl: 'https://www.bancobcr.com',
      officialPoderJudicialUrl: 'https://pj.poder-judicial.go.cr/',
    };
  }

  // Puntarenas (Puntarenas, Garabito, Aguirre / Quepos, Pérez Zeledón, Golfito)
  if (
    provLower.includes('puntarenas') ||
    courtLower.includes('puntarenas') ||
    courtLower.includes('garabito') ||
    courtLower.includes('quepos') ||
    courtLower.includes('aguirre') ||
    courtLower.includes('golfito')
  ) {
    return {
      circuitName: 'Circuito Judicial de Puntarenas (Tribunales de Puntarenas)',
      circuitNameEn: 'Judicial Circuit of Puntarenas (Puntarenas Courthouses)',
      despachoCode: '1610 (Juzgado de Cobro de Puntarenas)',
      ibanCRC: 'CR84015201001020637002',
      ibanUSD: 'CR44015201001026122002',
      bcrServiceName: 'Poder Judicial - Depósitos Judiciales Puntarenas',
      officialBcrPortalUrl: 'https://www.bancobcr.com',
      officialPoderJudicialUrl: 'https://pj.poder-judicial.go.cr/',
    };
  }

  // Limón (Limón, Pococí / Guápiles, Talamanca)
  if (
    provLower.includes('limón') ||
    provLower.includes('limon') ||
    courtLower.includes('limón') ||
    courtLower.includes('limon') ||
    courtLower.includes('pococí') ||
    courtLower.includes('guápiles')
  ) {
    return {
      circuitName: 'Circuito Judicial de Limón y Pococí',
      circuitNameEn: 'Judicial Circuit of Limón & Pococí',
      despachoCode: '1710 (Juzgado de Cobro de Limón)',
      ibanCRC: 'CR93015201001020748002',
      ibanUSD: 'CR57015201001026133002',
      bcrServiceName: 'Poder Judicial - Depósitos Judiciales Limón',
      officialBcrPortalUrl: 'https://www.bancobcr.com',
      officialPoderJudicialUrl: 'https://pj.poder-judicial.go.cr/',
    };
  }

  // Primer Circuito Judicial de San José (Default Fallback)
  return {
    circuitName: 'Primer Circuito Judicial de San José (Edificio de Tribunales)',
    circuitNameEn: 'First Judicial Circuit of San José (Main Courthouses)',
    despachoCode: '1100 (Juzgado 1° y 2° Especializado de Cobro I Circuito)',
    ibanCRC: 'CR26015201001020100802',
    ibanUSD: 'CR77015201001026060702',
    bcrServiceName: 'Poder Judicial - Depósitos Judiciales San José Centro',
    officialBcrPortalUrl: 'https://www.bancobcr.com',
    officialPoderJudicialUrl: 'https://pj.poder-judicial.go.cr/',
  };
}

export function ParticipateAuctionModal({
  auction,
  selectedCall = 1,
  isOpen,
  onClose,
}: ParticipateAuctionModalProps) {
  const { t, language } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [copiedExp, setCopiedExp] = useState(false);
  const [copiedDeposit50, setCopiedDeposit50] = useState(false);
  const [copiedDeposit30, setCopiedDeposit30] = useState(false);
  const [copiedCourtName, setCopiedCourtName] = useState(false);
  const [copiedIbanCRC, setCopiedIbanCRC] = useState(false);
  const [copiedIbanUSD, setCopiedIbanUSD] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const isEn = language === 'en';

  // Determine active call pricing and dates
  const effectiveCall = selectedCall || 1;
  const activeBasePrice =
    effectiveCall === 2 && auction.base_price_call_2
      ? auction.base_price_call_2
      : effectiveCall === 3 && auction.base_price_call_3
      ? auction.base_price_call_3
      : auction.base_price_call_1;

  const activeDate =
    effectiveCall === 2 && auction.auction_date_call_2
      ? auction.auction_date_call_2
      : effectiveCall === 3 && auction.auction_date_call_3
      ? auction.auction_date_call_3
      : auction.auction_date_call_1;

  const depositAmount50 = activeBasePrice * 0.5;
  const depositAmount30 = activeBasePrice * 0.3;

  const bcrInfo = getJudicialBCRAccount(auction.court_name, auction.province);

  const callTitle = {
    1: isEn ? '1st Call (100% Base)' : '1er Remate (100% Base)',
    2: isEn ? '2nd Call (75% Base / -25% Rebaja)' : '2do Remate (75% Base / -25% Rebaja)',
    3: isEn ? '3rd Call (25% Base / Liquidación)' : '3er Remate (25% Base / Liquidación)',
  }[effectiveCall];

  const totalEstimatedClosing = activeBasePrice * 0.0359;

  const courtLower = (auction.court_name || '').toLowerCase();
  const isSpecializedCobro = courtLower.includes('cobro') || courtLower.includes('civil');

  const handleCopyExp = () => {
    navigator.clipboard.writeText(auction.expediente_number);
    setCopiedExp(true);
    setTimeout(() => setCopiedExp(false), 2500);
  };

  const handleCopyDeposit50 = () => {
    navigator.clipboard.writeText(String(Math.round(depositAmount50)));
    setCopiedDeposit50(true);
    setTimeout(() => setCopiedDeposit50(false), 2500);
  };

  const handleCopyDeposit30 = () => {
    navigator.clipboard.writeText(String(Math.round(depositAmount30)));
    setCopiedDeposit30(true);
    setTimeout(() => setCopiedDeposit30(false), 2500);
  };

  const handleCopyCourtName = () => {
    navigator.clipboard.writeText(auction.court_name || '');
    setCopiedCourtName(true);
    setTimeout(() => setCopiedCourtName(false), 2500);
  };

  const handleCopyIbanCRC = () => {
    navigator.clipboard.writeText(bcrInfo.ibanCRC);
    setCopiedIbanCRC(true);
    setTimeout(() => setCopiedIbanCRC(false), 2500);
  };

  const handleCopyIbanUSD = () => {
    navigator.clipboard.writeText(bcrInfo.ibanUSD);
    setCopiedIbanUSD(true);
    setTimeout(() => setCopiedIbanUSD(false), 2500);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-600/20 dark:shadow-emerald-950/50 shrink-0">
              <Gavel className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {isEn ? 'Auction Participation Procedure' : 'Procedimiento para Participar en esta Subasta'}
                </h2>
                <span className="text-[10px] font-mono uppercase bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  {callTitle.split(' ')[0]}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                {getLocalizedPropertyTitle(auction, language)} • Folio: {auction.folio_real}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
          {/* Compact Notice & Mandatory Due Diligence Warning */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/40 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 flex-1">
              <p className="font-bold text-amber-950 dark:text-amber-200">
                {t.disclaimer.compact.title}
              </p>
              <p className="text-amber-900/90 dark:text-amber-200/90 leading-relaxed text-[11.5px]">
                {t.disclaimer.compact.body}
              </p>
            </div>
          </div>

          {/* 1. Active Call Financial & Schedule Snapshot */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Scheduled Date & Time */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10.5px] uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                {isEn ? 'Date & Time of Hearing' : 'Fecha y Hora Señalada'}
              </span>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {formatDateCR(activeDate, language)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {isEn ? 'Costa Rica Time (UTC-6)' : 'Hora oficial de Costa Rica'}
              </p>
            </div>

            {/* Active Base Price */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10.5px] uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                {isEn ? 'Active Call Base Price' : 'Base de Remate Activa'}
              </span>
              <p className="text-sm font-black text-slate-900 dark:text-white font-mono">
                {formatCurrency(activeBasePrice, auction.currency)}
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                {callTitle}
              </p>
            </div>

            {/* Mandatory Legal Deposits (30% Check vs 50% BCR) */}
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 space-y-1 relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
              <span className="text-[10.5px] uppercase font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                {isEn ? 'Statutory Bidding Deposit (Postura)' : 'Postura Legal Obligatoria'}
              </span>
              <div className="flex items-baseline justify-between pt-0.5">
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{isEn ? '30% Cashier’s Check:' : '30% Cheque Gerencia:'}</span>
                  <p className="text-base font-black text-emerald-800 dark:text-emerald-300 font-mono">
                    {formatCurrency(depositAmount30, auction.currency)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{isEn ? '50% (BCR / Repeat):' : '50% (BCR / Insubsistencia):'}</span>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                    {formatCurrency(depositAmount50, auction.currency)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Court Assignment & Remote Bidding Status */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-3">
              <div className="space-y-0.5">
                <span className="text-[10.5px] uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Landmark className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  {isEn ? 'Court Holding the Auction' : 'Juzgado a Cargo del Remate'}
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {auction.court_name}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  {isEn ? bcrInfo.circuitNameEn : bcrInfo.circuitName}
                </p>
              </div>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${auction.court_name}, Costa Rica`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 border border-slate-300 dark:border-slate-800 text-xs font-bold transition-all self-start sm:self-auto shadow-sm"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{isEn ? 'View Courthouse on Google Maps' : 'Ver Sede en Google Maps'}</span>
                <ExternalLink className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              </a>
            </div>

            {/* Remote Bidding Option Box */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
                <Video className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {isEn ? 'Remote Bidding Modality:' : 'Modalidad de Participación Virtual:'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    isSpecializedCobro
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-600/40'
                      : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }`}>
                    {isSpecializedCobro
                      ? (isEn ? 'Hybrid / Remote Available (Teams Judicial)' : 'Híbrida / Virtual Disponible (Teams)')
                      : (isEn ? 'In-Person at Courthouse' : 'Presencial en Sede Judicial')}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-normal">
                  {isEn
                    ? 'Under Judiciary Circular 35-2020, bidders can participate in-person or virtually via certified Microsoft Teams Judicial by filing their deposit voucher and registered judicial email locker (Casillero Judicial) at least 24 hours prior to the hearing.'
                    : 'Conforme a la Circular 35-2020 de Corte Plena, los postores pueden asistir presencialmente o conectarse por Teams Judicial presentando la boleta de depósito y señalando medio judicial al menos 24 horas antes.'}
                </p>
              </div>
            </div>
          </div>

          {/* 3. Mandatory Legal Deposit Methods (Option 1: BCR vs Option 2: Cashier's Check) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>{isEn ? 'Bidding Deposit Methods (Two Statutory Options)' : 'Opciones para Depositar la Postura Legal'}</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">
                    Ley N° 9342
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isEn
                    ? 'Choose either in-person cashier’s check (fastest refund) or advance electronic judicial deposit at BCR'
                    : 'Elija entre cheque de gerencia en sala (devolución inmediata) o depósito judicial electrónico anticipado en BCR'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Option 2: Same-Day In-Person Cashier's Check */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-950 border-2 border-emerald-300 dark:border-emerald-500/40 space-y-3.5 relative overflow-hidden flex flex-col justify-between shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 shrink-0">
                        <Banknote className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400 block">
                          {isEn ? 'Option A' : 'Opción A'}
                        </span>
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                          {isEn ? 'Same-Day Cashier’s Check (Cheque de Gerencia)' : 'Cheque de Gerencia en Sala'}
                        </h4>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300 dark:border-emerald-500/30 whitespace-nowrap">
                      {isEn ? '⚡ Fastest Refund' : '⚡ Devolución Inmediata'}
                    </span>
                  </div>

                  <p className="text-[11.5px] text-slate-600 dark:text-slate-400 leading-normal">
                    {isEn
                      ? 'Bring a physical certified cashier’s check issued by any regulated Costa Rican bank directly to the courtroom on auction day.'
                      : 'Lleve un cheque de gerencia físico emitido por cualquier banco regulado directamente a la sala de remates el día señalado.'}
                  </p>

                  {/* Dynamic Check Requirements Panel */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs font-mono">
                    {/* Payee */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-sans font-bold text-slate-500 uppercase block">
                        {isEn ? '1. Make Check Payable To (Páguese a la Orden de):' : '1. Páguese a la Orden de (Nombre Exacto):'}
                      </span>
                      <div className="flex items-center justify-between gap-1.5 p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <strong className="text-slate-900 dark:text-white text-[11.5px] font-sans font-bold select-all truncate">
                          {auction.court_name}
                        </strong>
                        <button
                          type="button"
                          onClick={handleCopyCourtName}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 shrink-0"
                          title="Copy court name"
                        >
                          {copiedCourtName ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Memo */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-sans font-bold text-slate-500 uppercase block">
                        {isEn ? '2. Check Memo / Detail (Detalle en Cheque):' : '2. Detalle / Memo en Cheque:'}
                      </span>
                      <div className="flex items-center justify-between gap-1.5 p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <strong className="text-slate-900 dark:text-white text-xs select-all">
                          EXP: {auction.expediente_number}
                        </strong>
                        <button
                          type="button"
                          onClick={handleCopyExp}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 shrink-0"
                          title="Copy docket"
                        >
                          {copiedExp ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Deposit Amount Calculation */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-sans font-bold text-slate-500 uppercase block">
                        {isEn ? '3. Check Amount (30% Standard Base):' : '3. Monto del Cheque (30% Base Estándar):'}
                      </span>
                      <div className="flex items-center justify-between gap-1.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40">
                        <div>
                          <strong className="text-emerald-700 dark:text-emerald-300 text-sm font-bold">
                            {formatCurrency(depositAmount30, auction.currency)}
                          </strong>
                          <span className="text-[10px] text-slate-500 font-sans block">
                            {isEn ? '(Or 50%/100% if designated as insubsistencia)' : '(O 50%/100% si se decretó insubsistencia)'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyDeposit30}
                          className="p-1 rounded bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 shrink-0 border border-emerald-300 dark:border-emerald-700"
                          title="Copy 30% deposit amount"
                        >
                          {copiedDeposit30 ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Requirements Note */}
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                    <p className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{isEn ? 'Attendance Requirements:' : 'Requisitos en Audiencia:'}</span>
                    </p>
                    <p>
                      {isEn
                        ? 'Bring valid original ID (cédula, DIMEX, or passport) and arrive 20–30 minutes early to confirm docket status with the clerk.'
                        : 'Llevar identificación original vigente (cédula, DIMEX o pasaporte) y presentarse 20–30 minutos antes para verificar el expediente.'}
                    </p>
                  </div>
                </div>

                {/* Refund Benefit Callout */}
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-[11px] text-emerald-900 dark:text-emerald-200 space-y-1 mt-2">
                  <p className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{isEn ? 'Refund Benefit — Immediate Return:' : 'Ventaja de Reintegro Inmediato:'}</span>
                  </p>
                  <p className="text-slate-700 dark:text-slate-300">
                    {isEn
                      ? 'If you are outbid, the court returns the physical cashier’s check immediately at the conclusion of the hearing.'
                      : 'Si otro postor supera su oferta, el juzgado le entrega el cheque físico inmediatamente al concluir el acto.'}
                  </p>
                </div>
              </div>

              {/* Option 1: Electronic Judicial Deposit (BCR) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3.5 relative overflow-hidden flex flex-col justify-between shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/30 shrink-0">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400 block">
                          {isEn ? 'Option B' : 'Opción B'}
                        </span>
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                          {isEn ? 'Electronic Deposit (BCR Account)' : 'Depósito Electrónico (Cuenta BCR)'}
                        </h4>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 text-[10px] font-bold border border-sky-300 dark:border-sky-500/30 whitespace-nowrap">
                      {isEn ? '🌐 Remote / Advance' : '🌐 Remoto / Anticipado'}
                    </span>
                  </div>

                  <p className="text-[11.5px] text-slate-600 dark:text-slate-400 leading-normal">
                    {isEn
                      ? 'Deposit directly to the court’s official judicial account at Banco de Costa Rica prior to the auction.'
                      : 'Deposite en la cuenta de depósitos judiciales del juzgado en el Banco de Costa Rica antes del remate.'}
                  </p>

                  {/* IBAN Numbers Display Grid */}
                  <div className="space-y-2 font-mono text-xs">
                    {/* USD IBAN */}
                    <div className={`p-2.5 rounded-xl border space-y-1 transition-all ${
                      auction.currency === 'USD'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/50'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-sans uppercase font-bold text-slate-500">
                          {isEn ? 'USD ($) Judicial IBAN' : 'IBAN Dólares (USD $)'}
                        </span>
                        {auction.currency === 'USD' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950 font-sans">
                            {isEn ? 'Property Currency' : 'Moneda Remate'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <strong className="text-slate-900 dark:text-white text-[11.5px] select-all">
                          {bcrInfo.ibanUSD}
                        </strong>
                        <button
                          type="button"
                          onClick={handleCopyIbanUSD}
                          className="p-1 rounded bg-white dark:bg-slate-800 text-slate-600 hover:text-emerald-600 border border-slate-200 dark:border-slate-700"
                          title="Copy USD IBAN"
                        >
                          {copiedIbanUSD ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* CRC Colones IBAN */}
                    <div className={`p-2.5 rounded-xl border space-y-1 transition-all ${
                      auction.currency === 'CRC'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/50'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-sans uppercase font-bold text-slate-500">
                          {isEn ? 'Colones (₡) Judicial IBAN' : 'IBAN Colones (CRC ₡)'}
                        </span>
                        {auction.currency === 'CRC' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950 font-sans">
                            {isEn ? 'Property Currency' : 'Moneda Remate'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <strong className="text-slate-900 dark:text-white text-[11.5px] select-all">
                          {bcrInfo.ibanCRC}
                        </strong>
                        <button
                          type="button"
                          onClick={handleCopyIbanCRC}
                          className="p-1 rounded bg-white dark:bg-slate-800 text-slate-600 hover:text-emerald-600 border border-slate-200 dark:border-slate-700"
                          title="Copy CRC IBAN"
                        >
                          {copiedIbanCRC ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Payment Channels Grid */}
                  <div className="grid grid-cols-3 gap-1.5 text-[10.5px]">
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-0.5">
                      <div className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                        <Smartphone className="w-3 h-3" />
                        <span>BCR App</span>
                      </div>
                      <p className="text-[9.5px] text-slate-500">Pagos → Depósitos</p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-0.5">
                      <div className="flex items-center gap-1 font-bold text-sky-600 dark:text-sky-400">
                        <CreditCard className="w-3 h-3" />
                        <span>SINPE</span>
                      </div>
                      <p className="text-[9.5px] text-slate-500">BAC / BNCR al IBAN</p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-0.5">
                      <div className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                        <Building className="w-3 h-3" />
                        <span>Ventanilla</span>
                      </div>
                      <p className="text-[9.5px] text-slate-500">150+ sucursales BCR</p>
                    </div>
                  </div>
                </div>

                {/* Refund Notice for BCR */}
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 text-[11px] text-amber-900 dark:text-amber-200 space-y-1 mt-2">
                  <p className="font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>{isEn ? 'Refund Notice if Outbid:' : 'Aviso de Reintegro si no resulta ganador:'}</span>
                  </p>
                  <p className="text-slate-700 dark:text-slate-300">
                    {isEn
                      ? 'Judicial deposit refunds typically take 3–10 business days following the court’s formal resolution (auto).'
                      : 'El reintegro del depósito judicial suele tardar de 3 a 10 días hábiles tras dictarse el auto judicial correspondiente.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Step-by-Step Bidding Protocol */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{isEn ? 'Step-by-Step Participation Protocol' : 'Protocolo Paso a Paso de Participación'}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Step 1: Deposit */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                    1
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {isEn ? 'Prior to Auction' : 'Previo al Remate'}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  {isEn ? 'Prepare Cashier’s Check (30%) or BCR Deposit' : 'Preparar Cheque de Gerencia (30%) o Depósito BCR'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-normal">
                  {isEn
                    ? 'Obtain a 30% cashier’s check payable to the court with the docket number in the memo (for immediate refund), or transfer to the court’s BCR judicial account.'
                    : 'Emita un cheque de gerencia del 30% a la orden del juzgado con el expediente en el memo (para devolución inmediata), o deposite en la cuenta BCR del juzgado.'}
                </p>

                {/* Account Reference Box */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                    <span className="text-slate-500">{isEn ? 'Docket / Expediente:' : 'Expediente Judicial:'}</span>
                    <div className="flex items-center gap-1">
                      <strong className="text-slate-900 dark:text-white">{auction.expediente_number}</strong>
                      <button onClick={handleCopyExp} className="p-1 hover:text-emerald-600 dark:hover:text-white" title="Copy docket">
                        {copiedExp ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                    <span className="text-slate-500">{isEn ? '30% Check Amount:' : 'Monto Cheque (30%):'}</span>
                    <div className="flex items-center gap-1">
                      <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(depositAmount30, auction.currency)}</strong>
                      <button onClick={handleCopyDeposit30} className="p-1 hover:text-emerald-600 dark:hover:text-white" title="Copy 30% amount">
                        {copiedDeposit30 ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Hearing Attendance */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                    2
                  </span>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    {isEn ? '20-30 Mins Before Start' : '20-30 Min Antes'}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  {isEn ? 'Present Check / Voucher & Bid' : 'Presentar Cheque / Boleta y Pujar'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-normal">
                  {isEn
                    ? 'Present your physical cashier’s check or BCR voucher and original ID (Passport / DIMEX / Cédula) to the judge. Bids are called openly (a viva voz).'
                    : 'Presente su cheque de gerencia físico o boleta BCR junto a su cédula/DIMEX/pasaporte original al juez para registrar sus pujas a viva voz.'}
                </p>

                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
                  <p>• <strong>{isEn ? 'If you win:' : 'Si resulta ganador:'}</strong> {isEn ? 'Declared adjudicatario by court order.' : 'Declarado adjudicatario en el acta judicial.'}</p>
                  <p>• <strong>{isEn ? 'If outbid:' : 'Si no gana:'}</strong> {isEn ? 'Cashier’s check returned immediately in courtroom.' : 'Cheque devuelto en sus manos al finalizar la audiencia.'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Post-Auction Timeline & Paying Winning Balance (Saldo de Precio) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>{isEn ? 'Winning Bid Timeline & Paying Balance (Saldo de Precio)' : 'Plazos Tras Ganar el Remate y Pago de Saldo'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <span className="font-bold text-amber-700 dark:text-amber-300 block flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>{isEn ? '3 Business Days Balance Deadline' : '3 Días Hábiles para Pagar el Saldo'}</span>
                </span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {isEn
                    ? 'Under Article 159 CPC, the winning bidder has exactly 3 business days to deposit the remaining purchase balance (Winning Bid minus 50% deposit) into the court’s BCR judicial account.'
                    : 'Conforme al Artículo 159 del Código Procesal Civil, el adjudicatario dispone de 3 días hábiles perentorios para depositar el saldo restante del precio en la cuenta del juzgado.'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 space-y-1.5 text-rose-900 dark:text-rose-200">
                <span className="font-bold text-rose-800 dark:text-rose-300 block flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>{isEn ? 'Strict Penalty for Non-Payment' : 'Pérdida de Postura por Incumplimiento'}</span>
                </span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {isEn
                    ? 'If the winning bidder fails to pay the balance within 3 business days, they forfeit their entire 50% deposit as a court penalty to cover damages and procedural costs.'
                    : 'Si el adjudicatario no deposita el saldo en 3 días hábiles, pierde el 50% depositado como sanción procesal a favor del juicio.'}
                </p>
              </div>
            </div>
          </div>

          {/* 6. How and When to Pay Closing & Registration Costs */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Building className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>{isEn ? 'When and How to Pay Closing Costs (Protocolization)' : '¿Cuándo y Cómo Pagar los Costos de Cierre?'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-bold text-slate-900 dark:text-slate-200 block">
                  {isEn ? '1. When to Pay:' : '1. Momento de Pago:'}
                </span>
                <p className="text-slate-600 dark:text-slate-400">
                  {isEn
                    ? 'Paid after the court issues the Auction Approval Ruling (Auto de Firmeza), typically 2 to 6 weeks post-auction when assigning your Notary Public.'
                    : 'Se cancelan una vez que el juzgado emite el Auto de Firmeza de Remate (2 a 6 semanas tras la subasta) al designar su Notario Público.'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-bold text-slate-900 dark:text-slate-200 block">
                  {isEn ? '2. Estimated Total Closing:' : '2. Costo Total Estimado:'}
                </span>
                <p className="text-emerald-600 dark:text-emerald-400 font-mono font-bold text-sm">
                  {formatCurrency(totalEstimatedClosing, auction.currency)} (~3.5%)
                </p>
                <p className="text-[10.5px] text-slate-500">
                  {isEn ? '1.5% Transfer Tax + 0.84% Stamps + 1.25% Notary' : '1.5% Traspaso + 0.84% Timbres + 1.25% Notario'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-bold text-slate-900 dark:text-slate-200 block">
                  {isEn ? '3. Title Registration:' : '3. Inscripción Registral:'}
                </span>
                <p className="text-slate-600 dark:text-slate-400">
                  {isEn
                    ? 'Your Notary files the protocolization deed at the National Registry, issuing you clear registered fee-simple title.'
                    : 'Su notario presenta la escritura de protocolización en el Registro Nacional para inscribir el título de propiedad a su nombre.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/95 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              {isEn
                ? 'Governed by Costa Rica Civil Procedure Code (Ley N° 9342) • Expediente ' + auction.expediente_number
                : 'Regulado por el Código Procesal Civil (Ley N° 9342) • Exp ' + auction.expediente_number}
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-800 font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isEn ? 'Print Instructions' : 'Imprimir Guía'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md shadow-emerald-600/20 dark:shadow-emerald-950/50"
            >
              {isEn ? 'Understood / Close' : 'Entendido / Cerrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
