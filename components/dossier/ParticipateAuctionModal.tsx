'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Auction } from '@/lib/types/auction';
import { formatCurrency, formatDateCR, detectPropertyCharacteristics, getLocalizedPropertyTitle } from '@/lib/utils';
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
  CalendarPlus,
  ArrowRight,
  Info,
  Building,
} from 'lucide-react';

interface ParticipateAuctionModalProps {
  auction: Auction;
  selectedCall?: 1 | 2 | 3;
  isOpen: boolean;
  onClose: () => void;
}

export function ParticipateAuctionModal({
  auction,
  selectedCall = 1,
  isOpen,
  onClose,
}: ParticipateAuctionModalProps) {
  const { language } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [copiedExp, setCopiedExp] = useState(false);
  const [copiedDeposit, setCopiedDeposit] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll and handle Escape key
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

  // Determine active base price & date based on selected call
  let activeBasePrice = auction.base_price_call_1;
  let activeDate = auction.auction_date_call_1;
  let callTitle = isEn ? '1st Call (100% Base)' : '1er Remate (100% Base)';
  let callBadge = '100%';
  let callColor = 'emerald';

  if (selectedCall === 2 && auction.base_price_call_2 && auction.auction_date_call_2) {
    activeBasePrice = auction.base_price_call_2;
    activeDate = auction.auction_date_call_2;
    callTitle = isEn ? '2nd Call (75% Base / -25% Off)' : '2do Remate (75% Base / -25%)';
    callBadge = '75%';
    callColor = 'amber';
  } else if (selectedCall === 3 && auction.base_price_call_3 && auction.auction_date_call_3) {
    activeBasePrice = auction.base_price_call_3;
    activeDate = auction.auction_date_call_3;
    callTitle = isEn ? '3rd Call (25% Base / Liquidation Floor)' : '3er Remate (25% Base / Liquidación)';
    callBadge = '25%';
    callColor = 'rose';
  }

  // Statutory 50% Legal Bidding Deposit (Art. 159 CPC)
  const depositAmount = activeBasePrice * 0.5;

  // Estimated Closing & Registration Costs
  const transferTax = activeBasePrice * 0.015;
  const stamps = activeBasePrice * 0.0084;
  const notaryFees = activeBasePrice * 0.0125;
  const totalEstimatedClosing = transferTax + stamps + notaryFees;

  // Remote Bidding Evaluation:
  // Specialized Collection Courts (Juzgados de Cobro Judicial) support Microsoft Teams Judicial
  const isSpecializedCobro =
    (auction.court_name || '').toLowerCase().includes('cobro') ||
    (auction.court_name || '').toLowerCase().includes('civil');

  const handleCopyExp = () => {
    navigator.clipboard.writeText(auction.expediente_number);
    setCopiedExp(true);
    setTimeout(() => setCopiedExp(false), 2500);
  };

  const handleCopyDeposit = () => {
    navigator.clipboard.writeText(String(Math.round(depositAmount)));
    setCopiedDeposit(true);
    setTimeout(() => setCopiedDeposit(false), 2500);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        className="relative w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto text-slate-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800 bg-slate-950/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-950/50 shrink-0">
              <Gavel className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  {isEn ? 'Auction Participation Procedure' : 'Procedimiento para Participar en esta Subasta'}
                </h2>
                <span className="text-[10px] font-mono uppercase bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  {callTitle.split(' ')[0]}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                {getLocalizedPropertyTitle(auction, language)} • Folio: {auction.folio_real}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 text-slate-300 text-xs sm:text-sm leading-relaxed">
          {/* 1. Active Call Financial & Schedule Snapshot */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Scheduled Date & Time */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10.5px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                {isEn ? 'Date & Time of Hearing' : 'Fecha y Hora Señalada'}
              </span>
              <p className="text-sm font-black text-white">
                {formatDateCR(activeDate, language)}
              </p>
              <p className="text-[11px] text-slate-400 font-medium">
                {isEn ? 'Costa Rica Time (UTC-6)' : 'Hora oficial de Costa Rica'}
              </p>
            </div>

            {/* Active Base Price */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10.5px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                {isEn ? 'Active Call Base Price' : 'Base de Remate Activa'}
              </span>
              <p className="text-sm font-black text-white font-mono">
                {formatCurrency(activeBasePrice, auction.currency)}
              </p>
              <p className="text-[11px] text-emerald-400 font-bold">
                {callTitle}
              </p>
            </div>

            {/* Mandatory 50% Legal Deposit */}
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-1 relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
              <span className="text-[10.5px] uppercase font-bold text-emerald-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                {isEn ? '50% Legal Deposit (Postura)' : 'Depósito 50% Postura Legal'}
              </span>
              <p className="text-base font-black text-emerald-300 font-mono">
                {formatCurrency(depositAmount, auction.currency)}
              </p>
              <p className="text-[10.5px] text-slate-300">
                {isEn ? 'Required to participate & bid' : 'Requisito obligatorio para pujar'}
              </p>
            </div>
          </div>

          {/* 2. Court Assignment & Remote Bidding Status */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="space-y-0.5">
                <span className="text-[10.5px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Landmark className="w-3.5 h-3.5 text-emerald-400" />
                  {isEn ? 'Court Holding the Auction' : 'Juzgado a Cargo del Remate'}
                </span>
                <p className="text-sm font-bold text-white">
                  {auction.court_name}
                </p>
              </div>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${auction.court_name}, Costa Rica`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-800 text-xs font-bold transition-all self-start sm:self-auto"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isEn ? 'View Courthouse on Google Maps' : 'Ver Sede en Google Maps'}</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
            </div>

            {/* Remote Bidding Option Box */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 shrink-0">
                <Video className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">
                    {isEn ? 'Remote Bidding Modality:' : 'Modalidad de Participación Virtual:'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    isSpecializedCobro
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-600/40'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {isSpecializedCobro
                      ? (isEn ? 'Hybrid / Remote Available (Teams Judicial)' : 'Híbrida / Virtual Disponible (Teams)')
                      : (isEn ? 'In-Person at Courthouse' : 'Presencial en Sede Judicial')}
                  </span>
                </div>
                <p className="text-slate-400 leading-normal">
                  {isEn
                    ? 'Under Judiciary Circular 35-2020, bidders can participate in-person or virtually via certified Microsoft Teams Judicial by filing their deposit voucher and registered judicial email locker (Casillero Judicial) at least 24 hours prior to the hearing.'
                    : 'Conforme a la Circular 35-2020 de Corte Plena, los postores pueden asistir presencialmente o conectarse por Teams Judicial presentando la boleta de depósito y señalando medio judicial al menos 24 horas antes.'}
                </p>
              </div>
            </div>
          </div>

          {/* 3. Step-by-Step Bidding & 50% Deposit Instructions */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>{isEn ? 'Step-by-Step Participation Protocol' : 'Protocolo Paso a Paso de Participación'}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Step 1: Deposit */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                    1
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {isEn ? 'Prior to Auction Date' : 'Antes de la Subasta'}
                  </span>
                </div>
                <h4 className="font-bold text-white text-xs sm:text-sm">
                  {isEn ? 'Deposit 50% Legal Deposit into BCR Account' : 'Depositar 50% de Postura en Cuenta BCR'}
                </h4>
                <p className="text-xs text-slate-400 leading-normal">
                  {isEn
                    ? 'Make the 50% bidding deposit into the official Judicial Account at Banco de Costa Rica (BCR) assigned to this court.'
                    : 'Realice el depósito de postura legal del 50% en la Cuenta de Depósitos Judiciales del Juzgado en el Banco de Costa Rica (BCR).'}
                </p>

                {/* Account Reference Box */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-500">{isEn ? 'Docket / Expediente:' : 'Expediente Judicial:'}</span>
                    <div className="flex items-center gap-1">
                      <strong className="text-white">{auction.expediente_number}</strong>
                      <button onClick={handleCopyExp} className="p-1 hover:text-white" title="Copy docket">
                        {copiedExp ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-500">{isEn ? 'Deposit Amount:' : 'Monto Postura:'}</span>
                    <div className="flex items-center gap-1">
                      <strong className="text-emerald-400">{formatCurrency(depositAmount, auction.currency)}</strong>
                      <button onClick={handleCopyDeposit} className="p-1 hover:text-white" title="Copy amount">
                        {copiedDeposit ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Hearing Attendance */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                    2
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                    {isEn ? '15 Mins Before Start' : '15 Min Antes del Remate'}
                  </span>
                </div>
                <h4 className="font-bold text-white text-xs sm:text-sm">
                  {isEn ? 'Present Deposit Voucher & Bidding' : 'Presentar Boleta y Participar en Pujas'}
                </h4>
                <p className="text-xs text-slate-400 leading-normal">
                  {isEn
                    ? 'Present original BCR deposit receipt and valid ID (Passport / DIMEX / Cédula) to the judge. Bids are called openly (pujas a viva voz) starting from the base.'
                    : 'Presente la boleta física o digital original del BCR y su documento de identidad (Cédula / Pasaporte / DIMEX) al juez para registrar sus pujas a viva voz.'}
                </p>

                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                  <p>• <strong>{isEn ? 'If you win:' : 'Si resulta ganador:'}</strong> {isEn ? 'Declared adjudicatario by court order.' : 'Declarado adjudicatario en el acta judicial.'}</p>
                  <p>• <strong>{isEn ? 'If outbid:' : 'Si no gana:'}</strong> {isEn ? 'Deposit returned immediately after hearing.' : 'Devolución inmediata de la boleta de depósito.'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Post-Auction Timeline & Paying Winning Balance (Saldo de Precio) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>{isEn ? 'Winning Bid Timeline & Paying Balance (Saldo de Precio)' : 'Plazos Tras Ganar el Remate y Pago de Saldo'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <span className="font-bold text-amber-300 block flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isEn ? '3 Business Days Balance Deadline' : '3 Días Hábiles para Pagar el Saldo'}</span>
                </span>
                <p className="text-slate-300 leading-relaxed">
                  {isEn
                    ? 'Under Article 159 CPC, the winning bidder has exactly 3 business days to deposit the remaining purchase balance (Winning Bid minus 50% deposit) into the court’s BCR judicial account.'
                    : 'Conforme al Artículo 159 del Código Procesal Civil, el adjudicatario dispone de 3 días hábiles perentorios para depositar el saldo restante del precio en la cuenta del juzgado.'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-1.5 text-rose-200">
                <span className="font-bold text-rose-300 block flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>{isEn ? 'Strict Penalty for Non-Payment' : 'Pérdida de Postura por Incumplimiento'}</span>
                </span>
                <p className="text-slate-300 leading-relaxed">
                  {isEn
                    ? 'If the winning bidder fails to pay the balance within 3 business days, they forfeit their entire 50% deposit as a court penalty to cover damages and procedural costs.'
                    : 'Si el adjudicatario no deposita el saldo en 3 días hábiles, pierde el 50% depositado como sanción procesal a favor del juicio.'}
                </p>
              </div>
            </div>
          </div>

          {/* 5. How and When to Pay Closing & Registration Costs */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Building className="w-4 h-4 text-sky-400" />
              <span>{isEn ? 'When and How to Pay Closing Costs (Protocolization)' : '¿Cuándo y Cómo Pagar los Costos de Cierre?'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="font-bold text-slate-200 block">
                  {isEn ? '1. When to Pay:' : '1. Momento de Pago:'}
                </span>
                <p className="text-slate-400">
                  {isEn
                    ? 'Paid after the court issues the Auction Approval Ruling (Auto de Firmeza), typically 2 to 6 weeks post-auction when assigning your Notary Public.'
                    : 'Se cancelan una vez que el juzgado emite el Auto de Firmeza de Remate (2 a 6 semanas tras la subasta) al designar su Notario Público.'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="font-bold text-slate-200 block">
                  {isEn ? '2. Estimated Total Closing:' : '2. Costo Total Estimado:'}
                </span>
                <p className="text-emerald-400 font-mono font-bold text-sm">
                  {formatCurrency(totalEstimatedClosing, auction.currency)} (~3.5%)
                </p>
                <p className="text-[10.5px] text-slate-500">
                  {isEn ? '1.5% Transfer Tax + 0.84% Stamps + 1.25% Notary' : '1.5% Traspaso + 0.84% Timbres + 1.25% Notario'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="font-bold text-slate-200 block">
                  {isEn ? '3. Title Registration:' : '3. Inscripción Registral:'}
                </span>
                <p className="text-slate-400">
                  {isEn
                    ? 'Your Notary files the protocolization deed at the National Registry, issuing you clear registered fee-simple title.'
                    : 'Su notario presenta la escritura de protocolización en el Registro Nacional para inscribir el título de propiedad a su nombre.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/95 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {isEn
                ? 'Governed by Costa Rica Civil Procedure Code (Ley N° 9342) • Expediente ' + auction.expediente_number
                : 'Regulado por el Código Procesal Civil (Ley N° 9342) • Exp ' + auction.expediente_number}
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 font-bold transition-all flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isEn ? 'Print Instructions' : 'Imprimir Guía'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md shadow-emerald-950/50"
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
