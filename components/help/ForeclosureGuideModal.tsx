'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  Scale,
  HelpCircle,
  X,
  Clock,
  Users,
  Building2,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Calendar,
  Layers,
  Search,
  BookOpen,
  FileText,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Landmark,
  Compass,
  Bookmark,
  Calculator,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface ForeclosureGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type GuideTab = 'process_calls' | 'eligibility' | 'how_to_bid' | 'court_locations' | 'app_guide' | 'faq';

export function ForeclosureGuideModal({ isOpen, onClose }: ForeclosureGuideModalProps) {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<GuideTab>('process_calls');
  const [mounted, setMounted] = useState(false);

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

  const TABS: { id: GuideTab; label: string; icon: any }[] = [
    {
      id: 'process_calls',
      label: isEn ? 'The 3-Call Process' : 'Las 3 Subastas y Proceso',
      icon: Scale,
    },
    {
      id: 'eligibility',
      label: isEn ? 'Who Can Participate' : '¿Quién Puede Participar?',
      icon: Users,
    },
    {
      id: 'how_to_bid',
      label: isEn ? '50% Legal Deposit & Bidding' : 'Postura Legal y Pujas (50%)',
      icon: DollarSign,
    },
    {
      id: 'court_locations',
      label: isEn ? 'Court Locations' : 'Sedes Judiciales y Remates',
      icon: Landmark,
    },
    {
      id: 'app_guide',
      label: isEn ? 'How to Use App' : 'Guía de la Plataforma',
      icon: Compass,
    },
    {
      id: 'faq',
      label: isEn ? 'Legal FAQs' : 'Preguntas Frecuentes',
      icon: HelpCircle,
    },
  ];

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto text-slate-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-950/50">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>{isEn ? 'Costa Rica Judicial Foreclosure Guide' : 'Guía de Remates Judiciales en Costa Rica'}</span>
                <span className="text-[10px] font-mono uppercase bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Ley N° 9342
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isEn
                  ? 'Legal framework, 3-call statutory ladder, bidding procedures, and investor diligence.'
                  : 'Marco jurídico, escala de 3 remates, postura legal del 50% y uso de la plataforma.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Strip */}
        <div className="flex items-center gap-1.5 p-2 bg-slate-950/60 border-b border-slate-800 overflow-x-auto scrollbar-thin">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 text-slate-300 text-sm leading-relaxed">
          {/* TAB 1: THE 3-CALL PROCESS */}
          {activeTab === 'process_calls' && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 text-xs sm:text-sm">
                <p className="font-bold text-white mb-1 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-400" />
                  {isEn ? 'The Costa Rican Foreclosure Auction Lifecycle' : 'El Proceso de Ejecución Hipotecaria Judicial'}
                </p>
                <p>
                  {isEn
                    ? 'Judicial property auctions in Costa Rica are governed by the Civil Procedure Code (Código Procesal Civil, Ley 9342). When a debtor defaults on a registered mortgage, the creditor bank initiates a judicial foreclosure. The court publishes an official edict (Edicto de Remate) in the official gazette (Boletín Judicial) establishing a strict 3-call statutory ladder.'
                    : 'Las subastas de bienes inmuebles en Costa Rica están reguladas por el Código Procesal Civil (Ley N° 9342) y la Ley de Cobro Judicial. Cuando un deudor incumple un crédito hipotecario, el acreedor inicia la ejecución en los tribunales de cobro. El juzgado publica un edicto oficial en el Boletín Judicial con una escala obligatoria de 3 remates.'}
                </p>
              </div>

              <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>{isEn ? 'The 3 Statutory Auction Calls' : 'Escala Estatutaria de 3 Remates'}</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1st Call */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">
                      {isEn ? '1st Call • 100% Base' : '1er Remate • 100% Base'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-600/30">
                      100%
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {isEn
                      ? 'The auction starts at 100% of the court-approved appraisal or contract base price.'
                      : 'Inicia con el 100% de la base pactada en la hipoteca o del avalúo judicial.'}
                  </p>
                  <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <p>• <strong>{isEn ? 'Deposit:' : 'Depósito:'}</strong> 50% of 100% base</p>
                    <p>• <strong>{isEn ? 'Timeline:' : 'Fecha:'}</strong> {isEn ? 'Initial published date' : 'Fecha inicial publicada'}</p>
                  </div>
                </div>

                {/* 2nd Call */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
                      {isEn ? '2nd Call • 75% Base' : '2do Remate • 75% Base'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 text-[10px] font-mono font-bold border border-amber-600/30">
                      -25% OFF
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {isEn
                      ? 'If no bidders participate in the 1st call, the base price automatically drops by 25% (starting at 75%).'
                      : 'Si no hay postores en el 1er remate, la base rebaja automáticamente un 25% (inicia al 75%).'}
                  </p>
                  <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <p>• <strong>{isEn ? 'Deposit:' : 'Depósito:'}</strong> 50% of 75% base</p>
                    <p>• <strong>{isEn ? 'Timeline:' : 'Intervalo:'}</strong> ~10-15 {isEn ? 'business days later' : 'días hábiles después'}</p>
                  </div>
                </div>

                {/* 3rd Call */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 left-0 h-1 bg-rose-500" />
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-black uppercase text-rose-400 tracking-wider">
                      {isEn ? '3rd Call • 25% Floor' : '3er Remate • 25% Base'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 text-[10px] font-mono font-bold border border-rose-600/30">
                      -75% OFF
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {isEn
                      ? 'Maximum opportunity stage. Base drops to 25% of the original amount. The highest bid over 25% wins.'
                      : 'Fase de máxima oportunidad. La base baja al 25% original. Se adjudica a la mejor postura que supere el 25%.'}
                  </p>
                  <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <p>• <strong>{isEn ? 'Deposit:' : 'Depósito:'}</strong> 50% of 25% base</p>
                    <p>• <strong>{isEn ? 'Timeline:' : 'Intervalo:'}</strong> ~10-15 {isEn ? 'days after 2nd call' : 'días tras 2do remate'}</p>
                  </div>
                </div>
              </div>

              {/* Legal Purge Note */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>{isEn ? 'Lien & Encumbrance Purge (Art. 160 CPC)' : 'Purga Legal de Gravámenes Posteriores (Art. 160 CPC)'}</span>
                </h4>
                <p className="text-xs text-slate-400">
                  {isEn
                    ? 'When a 1st senior mortgage is foreclosed and adjudicated, all subsequent inferior mortgages, secondary liens, and judicial attachments (embargos) are automatically purged and erased by court order upon title registration.'
                    : 'Cuando se remata por ejecución de una hipoteca de 1° grado, todos los gravámenes hipotecarios de grado inferior, embargos y anotaciones posteriores quedan cancelados y purgados por orden del juzgado al protocolizar el título registral.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: WHO CAN PARTICIPATE */}
          {activeTab === 'eligibility' && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <div className="p-4 rounded-2xl bg-sky-950/30 border border-sky-500/30 text-sky-200 text-xs sm:text-sm">
                <p className="font-bold text-white mb-1 flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400" />
                  {isEn ? 'Universal Investor Eligibility' : 'Elegibilidad Universal para Inversionistas'}
                </p>
                <p>
                  {isEn
                    ? 'Judicial auctions in Costa Rica are open public hearings. Both Costa Rican citizens and foreign nationals from any country can freely participate and acquire titled real estate without requiring local residency.'
                    : 'Los remates judiciales en Costa Rica son actos públicos y abiertos. Tanto ciudadanos costarricenses como personas extranjeras pueden participar y adjudicarse bienes inmuebles sin necesidad de residencia previa.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Individuals */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{isEn ? 'Individual Bidders (Natural Persons)' : 'Personas Físicas (Nacionales o Extranjeros)'}</span>
                  </h4>
                  <ul className="text-xs text-slate-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span><strong>{isEn ? 'Costa Ricans:' : 'Costarricenses:'}</strong> Cédula de Identidad física vigente.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span><strong>{isEn ? 'Foreign Nationals:' : 'Extranjeros:'}</strong> Pasaporte vigente o cédula de residencia (DIMEX). No se requiere visa de residencia.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span><strong>{isEn ? 'Legal Age:' : 'Mayoría de Edad:'}</strong> Debe ser mayor de 18 años con plena capacidad jurídica.</span>
                    </li>
                  </ul>
                </div>

                {/* Legal Entities / Corporations */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    <span>{isEn ? 'Corporate Entities (S.A. / S.R.L.)' : 'Personas Jurídicas (Sociedades Anónimas / SRL)'}</span>
                  </h4>
                  <ul className="text-xs text-slate-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-400 font-bold">•</span>
                      <span><strong>{isEn ? 'Personería Jurídica:' : 'Personería Jurídica:'}</strong> Certificación notarial o digital del Registro Nacional con menos de 1 mes de expedida.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-400 font-bold">•</span>
                      <span><strong>{isEn ? 'Power of Attorney:' : 'Poder Especial:'}</strong> El representante debe contar con facultades suficientes para compras de bienes inmuebles.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-400 font-bold">•</span>
                      <span><strong>{isEn ? 'Tax ID:' : 'Cédula Jurídica:'}</strong> Cédula jurídica activa ante el Registro Nacional y Ministerio de Hacienda.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Disqualifications */}
              <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-1.5 text-xs text-amber-200">
                <p className="font-bold text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>{isEn ? 'Legal Exclusions (Who Cannot Bid):' : 'Incompatibilidades Estatutarias (¿Quiénes no pueden participar?):'}</span>
                </p>
                <p className="text-slate-300">
                  {isEn
                    ? 'Judges, court secretaries, and judicial appraisers handling the specific docket cannot participate in the auction, nor can minors or persons under court interdiction.'
                    : 'Los jueces, secretarios y peritos judiciales que intervengan en el expediente no pueden pujar ni adquirir el bien en la subasta, ni personas menores de edad o declaradas en interdicción judicial.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: HOW TO BID & 50% DEPOSIT */}
          {activeTab === 'how_to_bid' && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 text-xs sm:text-sm">
                <p className="font-bold text-white mb-1 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  {isEn ? 'Mandatory 50% Legal Bidding Deposit (Postura Legal)' : 'Depósito Obligatorio del 50% de Postura Legal'}
                </p>
                <p>
                  {isEn
                    ? 'To participate in any judicial auction in Costa Rica, bidders must deposit 50% of the active call base price prior to the start of the hearing into the official Judicial Account at Banco de Costa Rica (BCR).'
                    : 'Para tener derecho a pujar en cualquier subasta judicial, todo postor debe depositar previamente el 50% de la base activa en la Cuenta de Depósitos Judiciales del despacho en el Banco de Costa Rica (BCR).'}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-black text-white text-xs uppercase tracking-wider">
                  {isEn ? 'Step-by-Step Bidding Protocol' : 'Protocolo Paso a Paso para Participar'}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                      1
                    </span>
                    <h5 className="font-bold text-white text-xs">
                      {isEn ? 'Deposit 50% at BCR' : 'Depositar el 50% en BCR'}
                    </h5>
                    <p className="text-xs text-slate-400">
                      {isEn
                        ? 'Deposit 50% of the base price into the court’s official judicial account, referencing the exact Expediente docket number.'
                        : 'Realice el depósito del 50% de la base en la cuenta judicial del Juzgado en el BCR indicando el número de expediente exacto.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                      2
                    </span>
                    <h5 className="font-bold text-white text-xs">
                      {isEn ? 'Present Voucher at Court' : 'Presentar Boleta en Audiencia'}
                    </h5>
                    <p className="text-xs text-slate-400">
                      {isEn
                        ? 'Arrive 15 minutes before the hearing with your original deposit voucher and ID. The judge registers eligible bidders.'
                        : 'Llegue 15 minutos antes de la hora señalada con la boleta de depósito original y su cédula/pasaporte. El juez registra a los postores.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                      3
                    </span>
                    <h5 className="font-bold text-white text-xs">
                      {isEn ? 'Pay Balance in 3 Days' : 'Pagar Saldo en 3 Días'}
                    </h5>
                    <p className="text-xs text-slate-400">
                      {isEn
                        ? 'If you win, you have exactly 3 business days to deposit the remaining winning bid price. Unsuccessful bidders receive their deposit back immediately.'
                        : 'Si resulta adjudicatario, dispone de 3 días hábiles para depositar el resto del precio. A los postores no ganadores se les devuelve su depósito.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Forfeiture Warning */}
              <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 space-y-1 text-xs text-rose-200">
                <p className="font-bold text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>{isEn ? 'Warning on Balance Default (Pérdida de Postura):' : 'Advertencia por Falta de Pago de Saldo (Pérdida de Postura):'}</span>
                </p>
                <p className="text-slate-300">
                  {isEn
                    ? 'If the highest bidder fails to pay the remaining balance within 3 business days, they forfeit their entire 50% deposit as a court penalty to cover damages and procedural costs.'
                    : 'Si el mejor postor no paga el saldo restante en el plazo perentorio de 3 días hábiles, pierde el 50% depositado a favor del proceso para cubrir costas y perjuicios.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: COURT LOCATIONS & VENUES */}
          {activeTab === 'court_locations' && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs sm:text-sm">
                <p className="font-bold text-white flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-emerald-400" />
                  {isEn ? 'Judicial Despachos & Hearing Locations' : 'Despachos Judiciales y Sedes de Subasta'}
                </p>
                <p className="text-slate-300">
                  {isEn
                    ? 'Foreclosure auctions are held in the specific courtroom (Juzgado de Cobro Judicial or Juzgado Civil) where the case is docketed. The location is specified on the official edict and in our property dossier.'
                    : 'Las subastas judiciales se llevan a cabo en las instalaciones del juzgado específico donde radica el expediente (Juzgados de Cobro Judicial o Juzgados Civiles). La sede exacta se detalla en cada ficha de nuestra plataforma.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Juzgado Especializado de Cobro de San José</span>
                  </span>
                  <p className="text-slate-400">Edificio de Tribunales de Justicia, Primer Circuito Judicial, Calle 17, San José.</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Juzgado de Cobro de Santa Ana</span>
                  </span>
                  <p className="text-slate-400">Plaza Murano, Pozos de Santa Ana, San José.</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Juzgado de Cobro de Alajuela & Grecia</span>
                  </span>
                  <p className="text-slate-400">Tribunales de Justicia de Alajuela / Grecia Centro.</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Juzgados de Guanacaste & Puntarenas</span>
                  </span>
                  <p className="text-slate-400">Liberia, Santa Cruz, Nicoya, Garabito (Jacó) y Quepos.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs text-slate-300">
                <p className="font-bold text-white">
                  {isEn ? 'Virtual Hearings (Audiencias Virtuales):' : 'Modalidad Virtual y Mixta:'}
                </p>
                <p className="text-slate-400">
                  {isEn
                    ? 'Some judicial circuits allow pre-registered bidders to participate remotely via official Poder Judicial videoconferencing platforms (Microsoft Teams Judicial). You must register your electronic judicial locker (Casillero Electrónico) prior to the hearing date.'
                    : 'Algunos juzgados permiten la participación remota mediante las plataformas oficiales de videoconferencia del Poder Judicial (Teams Judicial). Es requisito registrarse previamente e indicar el medio de notificación judicial.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: HOW TO USE THE APP */}
          {activeTab === 'app_guide' && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 text-xs sm:text-sm">
                <p className="font-bold text-white mb-1 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-400" />
                  {isEn ? 'RematesCR Investor Toolset' : 'Herramientas Profesionales de RematesCR'}
                </p>
                <p>
                  {isEn
                    ? 'RematesCR provides institutional-grade intelligence on Costa Rican court property auctions with automated daily Gazette ingestion, PostGIS mapping, statutory yield calculators, and due diligence workflows.'
                    : 'RematesCR procesa diariamente las publicaciones oficiales del Boletín Judicial para ofrecer análisis geoespacial, cálculo de costos de traspaso estatutarios y listas de debida diligencia.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit">
                    <Search className="w-4 h-4" />
                  </div>
                  <h5 className="font-bold text-white text-sm">
                    {isEn ? '1. Catalog & Smart Filters' : '1. Catálogo y Filtros Avanzados'}
                  </h5>
                  <p className="text-slate-400">
                    {isEn
                      ? 'Filter by property type (Single-Family, Condo, Lot, Agricultural, Commercial), province, price bracket, call stage (1st, 2nd, 3rd), construction status, and road access.'
                      : 'Filtre por categoría de inmueble, provincia, rangos de precio, etapa de remate (1°, 2° o 3°), estado de construcción y acceso a calle pública.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 w-fit">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <h5 className="font-bold text-white text-sm">
                    {isEn ? '2. Financial Yield Calculator' : '2. Calculadora Financiera de Costos'}
                  </h5>
                  <p className="text-slate-400">
                    {isEn
                      ? 'Simulate total acquisition costs including statutory 1.50% transfer tax (Ley 7088), registry stamps (~0.84%), and notary protocolization fees (1.25%) to calculate net ROI and IRR.'
                      : 'Simula el costo total de traspaso incluyendo impuesto de traspaso (Ley 7088 - 1.50%), timbres registrales (~0.84%) y honorarios notariales para obtener el ROI neto.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 w-fit">
                    <Compass className="w-4 h-4" />
                  </div>
                  <h5 className="font-bold text-white text-sm">
                    {isEn ? '3. PostGIS Map Explorer' : '3. Mapa Geoespacial PostGIS'}
                  </h5>
                  <p className="text-slate-400">
                    {isEn
                      ? 'Visualize all active foreclosure properties mapped by district and cantonal centroids with quick inspection popups and centroid disclaimers.'
                      : 'Visualice todas las propiedades georreferenciadas con notas aclaratorias de centroides distritales para consultar el Plano Catastrado.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 w-fit">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <h5 className="font-bold text-white text-sm">
                    {isEn ? '4. Calendar & Watchlist' : '4. Calendario y Lista Privada'}
                  </h5>
                  <p className="text-slate-400">
                    {isEn
                      ? 'Sync auction dates directly to Google Calendar and Apple/Outlook (.ics), save properties to your watchlist, and record private due diligence notes.'
                      : 'Sincronice las fechas de subasta a Google Calendar y Apple/Outlook (.ics), guarde remates en favoritos y guarde notas privadas de inspección.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: FAQ */}
          {activeTab === 'faq' && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{isEn ? 'Can a foreigner purchase foreclosure properties in Costa Rica?' : '¿Puede un extranjero comprar remates en Costa Rica?'}</span>
                </h4>
                <p className="text-xs text-slate-400">
                  {isEn
                    ? 'Yes. Foreigners have equal constitutional rights to own private titled property in Costa Rica (Article 19 of the Constitution). You only need a valid passport or DIMEX to participate in the auction and receive legal title.'
                    : 'Sí. El artículo 19 de la Constitución Política de Costa Rica otorga a los extranjeros los mismos derechos que a los nacionales en materia de propiedad privada. Solo se requiere pasaporte vigente o DIMEX.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{isEn ? 'What happens if the foreclosed property is currently occupied?' : '¿Qué ocurre si el inmueble rematado está ocupado?'}</span>
                </h4>
                <p className="text-xs text-slate-400">
                  {isEn
                    ? 'Under Article 162 of the Civil Procedure Code, the buyer has the legal right to request an immediate Court Order of Possession (Puesta en Posesión Judicial). The court orders the eviction of occupants with the assistance of the Public Force (Fuerza Pública).'
                    : 'Según el Artículo 162 del Código Procesal Civil, el adjudicatario tiene derecho a solicitar la Puesta en Posesión Judicial inmediata. El tribunal ordena el desalojo y entrega física del inmueble con auxilio de la Fuerza Pública.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{isEn ? 'Are back taxes or municipal fees wiped out?' : '¿Se cancelan las deudas municipales acumuladas?'}</span>
                </h4>
                <p className="text-xs text-slate-400">
                  {isEn
                    ? 'Judicial mortgage liens are purged under Art. 160 CPC, but municipal property taxes (Impuestos de Bienes Inmuebles) attach directly to the land. You should verify tax solvency at the local municipality during your due diligence.'
                    : 'Los gravámenes hipotecarios posteriores se purgan (Art. 160 CPC), pero los impuestos municipales de bienes inmuebles gravan directamente la finca. Debe revisarse el saldo municipal antes de la subasta.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{isEn ? 'What currency is used in the auction?' : '¿En qué moneda se paga la subasta?'}</span>
                </h4>
                <p className="text-xs text-slate-400">
                  {isEn
                    ? 'The currency (USD $ or CRC ₡) is established by the original mortgage contract and stated in the edict. The 50% deposit and final balance must be paid in the currency specified by the court.'
                    : 'La moneda (USD o CRC) viene definida en la escritura de hipoteca y en el edicto. Tanto el 50% de postura legal como el saldo final deben depositarse en la moneda señalada por el tribunal.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {isEn
                ? 'Reference: Código Procesal Civil de Costa Rica (Ley N° 9342) • Boletín Judicial'
                : 'Referencia: Código Procesal Civil de Costa Rica (Ley N° 9342) • Imprenta Nacional'}
            </span>
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md self-end sm:self-auto"
          >
            {isEn ? 'Close Guide' : 'Entendido / Cerrar'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
