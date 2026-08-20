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
  Sparkles,
  Award,
  Zap,
  ShieldAlert,
  Info,
} from 'lucide-react';

interface ForeclosureGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type GuideTab = 'process_calls' | 'eligibility' | 'how_to_bid' | 'opportunity_ratings' | 'court_locations' | 'app_guide' | 'legal_disclaimer' | 'faq';

export function ForeclosureGuideModal({ isOpen, onClose }: ForeclosureGuideModalProps) {
  const { t, language } = useLanguage();
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
      label: isEn ? 'The 3-Call Process' : 'Las 3 Subastas',
      icon: Scale,
    },
    {
      id: 'eligibility',
      label: isEn ? 'Who Can Participate' : 'Elegibilidad y Postores',
      icon: Users,
    },
    {
      id: 'how_to_bid',
      label: isEn ? '50% Deposit & Bidding' : 'Postura Legal (50%)',
      icon: DollarSign,
    },
    {
      id: 'opportunity_ratings',
      label: isEn ? 'Opportunity Alpha & Risk' : 'Calificación de Oportunidad',
      icon: Sparkles,
    },
    {
      id: 'court_locations',
      label: isEn ? 'Court Locations' : 'Sedes Judiciales',
      icon: Landmark,
    },
    {
      id: 'app_guide',
      label: isEn ? 'Using REmatrixCR' : 'Uso de la Plataforma',
      icon: Compass,
    },
    {
      id: 'legal_disclaimer',
      label: isEn ? 'Legal Disclaimer & Terms' : 'Aviso Legal y Términos',
      icon: ShieldAlert,
    },
    {
      id: 'faq',
      label: isEn ? 'Frequently Asked Questions' : 'Preguntas Frecuentes',
      icon: HelpCircle,
    },
  ];

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        className="relative w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl max-h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-600/20 dark:shadow-emerald-950/50 shrink-0">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>{isEn ? 'Costa Rica Judicial Foreclosure Guide' : 'Guía de Remates Judiciales en Costa Rica'}</span>
                <span className="text-[10px] font-mono uppercase bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  Ley N° 9342
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEn
                  ? 'Legal framework, 3-call statutory ladder, bidding procedures, and investor diligence.'
                  : 'Marco jurídico, escala de 3 remates, postura legal del 50% y uso de la plataforma.'}
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

        {/* Tab Navigation Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-1.5 p-2.5 bg-slate-100 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-xl text-xs font-bold text-center transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 dark:shadow-emerald-950/50 ring-1 ring-emerald-400/40'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800/80 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
          {/* TAB 1: THE 3-CALL PROCESS */}
          {activeTab === 'process_calls' && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm">
                <p className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  {isEn ? 'The Costa Rican Foreclosure Auction Lifecycle' : 'El Proceso de Ejecución Hipotecaria Judicial'}
                </p>
                <p>
                  {isEn
                    ? 'Judicial property auctions in Costa Rica are governed by the Civil Procedure Code (Código Procesal Civil, Ley 9342). When a debtor defaults on a registered mortgage, the creditor bank initiates a judicial foreclosure. The court publishes an official edict (Edicto de Remate) in the official gazette (Boletín Judicial) establishing a strict 3-call statutory ladder.'
                    : 'Las subastas de bienes inmuebles en Costa Rica están reguladas por el Código Procesal Civil (Ley N° 9342) y la Ley de Cobro Judicial. Cuando un deudor incumple un crédito hipotecario, el acreedor inicia la ejecución en los tribunales de cobro. El juzgado publica un edicto oficial en el Boletín Judicial con una escala obligatoria de 3 remates.'}
                </p>
              </div>

              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{isEn ? 'The 3 Statutory Auction Calls' : 'Escala Estatutaria de 3 Remates'}</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1st Call */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                      {isEn ? '1st Call • 100% Base' : '1er Remate • 100% Base'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-mono font-bold border border-emerald-300 dark:border-emerald-600/30">
                      100%
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    {isEn
                      ? 'The auction starts at 100% of the court-approved appraisal or contract base price.'
                      : 'Inicia con el 100% de la base pactada en la hipoteca o del avalúo judicial.'}
                  </p>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                    <p>• <strong>{isEn ? 'Deposit:' : 'Depósito:'}</strong> 50% of 100% base</p>
                    <p>• <strong>{isEn ? 'Timeline:' : 'Fecha:'}</strong> {isEn ? 'Initial published date' : 'Fecha inicial publicada'}</p>
                  </div>
                </div>

                {/* 2nd Call */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                      {isEn ? '2nd Call • 75% Base' : '2do Remate • 75% Base'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-mono font-bold border border-amber-300 dark:border-amber-600/30">
                      -25% OFF
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    {isEn
                      ? 'If no bidders participate in the 1st call, the base price automatically drops by 25% (starting at 75%).'
                      : 'Si no hay postores en el 1er remate, la base rebaja automáticamente un 25% (inicia al 75%).'}
                  </p>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                    <p>• <strong>{isEn ? 'Deposit:' : 'Depósito:'}</strong> 50% of 75% base</p>
                    <p>• <strong>{isEn ? 'Timeline:' : 'Intervalo:'}</strong> ~10-15 {isEn ? 'business days later' : 'días hábiles después'}</p>
                  </div>
                </div>

                {/* 3rd Call */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 left-0 h-1 bg-rose-500" />
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-black uppercase text-rose-600 dark:text-rose-400 tracking-wider">
                      {isEn ? '3rd Call • 25% Floor' : '3er Remate • 25% Base'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 text-[10px] font-mono font-bold border border-rose-300 dark:border-rose-600/30">
                      -75% OFF
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    {isEn
                      ? 'Maximum opportunity stage. Base drops to 25% of the original amount. The highest bid over 25% wins.'
                      : 'Fase de máxima oportunidad. La base baja al 25% original. Se adjudica a la mejor postura que supere el 25%.'}
                  </p>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                    <p>• <strong>{isEn ? 'Deposit:' : 'Depósito:'}</strong> 50% of 25% base</p>
                    <p>• <strong>{isEn ? 'Timeline:' : 'Intervalo:'}</strong> ~10-15 {isEn ? 'days after 2nd call' : 'días tras 2do remate'}</p>
                  </div>
                </div>
              </div>

              {/* Legal Purge Note */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{isEn ? 'Lien & Encumbrance Purge (Art. 160 CPC)' : 'Purga Legal de Gravámenes Posteriores (Art. 160 CPC)'}</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
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
              <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-500/30 text-sky-900 dark:text-sky-200 text-xs sm:text-sm">
                <p className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />
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
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{isEn ? 'Individual Bidders (Natural Persons)' : 'Personas Físicas (Nacionales o Extranjeros)'}</span>
                  </h4>
                  <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                      <span><strong>{isEn ? 'Costa Ricans:' : 'Costarricenses:'}</strong> Cédula de Identidad física vigente.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                      <span><strong>{isEn ? 'Foreign Nationals:' : 'Extranjeros:'}</strong> Pasaporte vigente o cédula de residencia (DIMEX). No se requiere visa de residencia.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                      <span><strong>{isEn ? 'Legal Age:' : 'Mayoría de Edad:'}</strong> Debe ser mayor de 18 años con plena capacidad jurídica.</span>
                    </li>
                  </ul>
                </div>

                {/* Legal Entities / Corporations */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>{isEn ? 'Corporate Entities (S.A. / S.R.L.)' : 'Personas Jurídicas (Sociedades Anónimas / SRL)'}</span>
                  </h4>
                  <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">•</span>
                      <span><strong>{isEn ? 'Personería Jurídica:' : 'Personería Jurídica:'}</strong> Certificación notarial o digital del Registro Nacional con menos de 1 mes de expedida.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">•</span>
                      <span><strong>{isEn ? 'Power of Attorney:' : 'Poder Especial:'}</strong> El representante debe contar con facultades suficientes para compras de bienes inmuebles.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">•</span>
                      <span><strong>{isEn ? 'Tax ID:' : 'Cédula Jurídica:'}</strong> Cédula jurídica activa ante el Registro Nacional y Ministerio de Hacienda.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Disqualifications */}
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
                <p className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>{isEn ? 'Legal Exclusions (Who Cannot Bid):' : 'Incompatibilidades Estatutarias (¿Quiénes no pueden participar?):'}</span>
                </p>
                <p className="text-slate-700 dark:text-slate-300">
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
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm">
                <p className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  {isEn ? 'Mandatory 50% Legal Bidding Deposit (Postura Legal)' : 'Depósito Obligatorio del 50% de Postura Legal'}
                </p>
                <p>
                  {isEn
                    ? 'To participate in any judicial auction in Costa Rica, bidders must deposit 50% of the active call base price prior to the start of the hearing into the official Judicial Account at Banco de Costa Rica (BCR).'
                    : 'Para tener derecho a pujar en cualquier subasta judicial, todo postor debe depositar previamente el 50% de la base activa en la Cuenta de Depósitos Judiciales del despacho en el Banco de Costa Rica (BCR).'}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                  {isEn ? 'Step-by-Step Bidding Protocol' : 'Protocolo Paso a Paso para Participar'}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                      1
                    </span>
                    <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                      {isEn ? 'Deposit 50% at BCR' : 'Depositar el 50% en BCR'}
                    </h5>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {isEn
                        ? 'Deposit 50% of the base price into the court’s official judicial account, referencing the exact Expediente docket number.'
                        : 'Realice el depósito del 50% de la base en la cuenta judicial del Juzgado en el BCR indicando el número de expediente exacto.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                      2
                    </span>
                    <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                      {isEn ? 'Present Voucher at Court' : 'Presentar Boleta en Audiencia'}
                    </h5>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {isEn
                        ? 'Arrive 15 minutes before the hearing with your original deposit voucher and ID. The judge registers eligible bidders.'
                        : 'Llegue 15 minutos antes de la hora señalada con la boleta de depósito original y su cédula/pasaporte. El juez registra a los postores.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                      3
                    </span>
                    <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                      {isEn ? 'Pay Balance in 3 Days' : 'Pagar Saldo en 3 Días'}
                    </h5>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {isEn
                        ? 'If you win, you have exactly 3 business days to deposit the remaining winning bid price. Unsuccessful bidders receive their deposit back immediately.'
                        : 'Si resulta adjudicatario, dispone de 3 días hábiles para depositar el resto del precio. A los postores no ganadores se les devuelve su depósito.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Forfeiture Warning */}
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 space-y-1 text-xs text-rose-900 dark:text-rose-200">
                <p className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>{isEn ? 'Warning on Balance Default (Pérdida de Postura):' : 'Advertencia por Falta de Pago de Saldo (Pérdida de Postura):'}</span>
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  {isEn
                    ? 'If the highest bidder fails to pay the remaining balance within 3 business days, they forfeit their entire 50% deposit as a court penalty to cover damages and procedural costs.'
                    : 'Si el mejor postor no paga el saldo restante en el plazo perentorio de 3 días hábiles, pierde el 50% depositado a favor del proceso para cubrir costas y perjuicios.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: OPPORTUNITY RATINGS & RISK SCORING */}
          {activeTab === 'opportunity_ratings' && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              {/* Header Card */}
              <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-50 via-slate-50 to-teal-50 dark:from-emerald-950/70 dark:via-slate-950 dark:to-teal-950/70 border border-emerald-200 dark:border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>{isEn ? 'Proprietary Underwriting & Legal Rating Engine' : 'Motor Algorítmico de Rentabilidad y Prelación Jurídica'}</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {isEn ? 'How Opportunity Alpha & Title Security Ratings Work' : 'Cómo se Calculan las Calificaciones de Oportunidad y Rango'}
                </h3>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {isEn
                    ? 'Our platform applies a multi-dimensional scoring matrix to every foreclosure published in the Official Judicial Bulletin. Deals receive an Opportunity Alpha Grade (AAA to C) for economic yield and a Title Security Tier (Tier 1 to 3) based on Costa Rican Civil Procedure Code (Law 9342).'
                    : 'Nuestra plataforma aplica una matriz algorítmica multidimensional a cada remate del Boletín Judicial. Cada oportunidad recibe una Calificación Alpha (AAA a C) por rentabilidad y un Nivel de Seguridad Registral (Nivel 1 a 3) conforme al Código Procesal Civil (Ley 9342).'}
                </p>
              </div>

              {/* 1. Alpha Grades Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{isEn ? '1. Opportunity Alpha Grading Scale (0 – 100)' : '1. Escala de Calificación de Oportunidad (0 – 100)'}</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-emerald-300 dark:border-emerald-500/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs">Grade AAA</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">90 – 100 pts</span>
                    </div>
                    <strong className="text-slate-900 dark:text-white block font-bold">
                      {isEn ? 'Extraordinary Spread / Prime Liquidity' : 'Oportunidad Extraordinaria'}
                    </strong>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11.5px]">
                      {isEn
                        ? 'Deep statutory discount (2nd/3rd call), margin >35%, high-demand asset class in a liquid market.'
                        : 'Gran descuento de ley (2° o 3° remate), margen superior al 35% y alta liquidez de reventa.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-teal-300 dark:border-teal-500/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-lg bg-teal-500 text-slate-950 font-black text-xs">Grade AA</span>
                      <span className="font-mono font-bold text-teal-600 dark:text-teal-400">80 – 89 pts</span>
                    </div>
                    <strong className="text-slate-900 dark:text-white block font-bold">
                      {isEn ? 'High Yield Opportunity' : 'Excelente Rentabilidad'}
                    </strong>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11.5px]">
                      {isEn
                        ? 'Strong statutory discount and attractive profit margin (>25%). Outstanding risk-adjusted return.'
                        : 'Sólido descuento de ley y margen muy atractivo (>25%). Retorno ajustado a riesgo sobresaliente.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-sky-300 dark:border-sky-500/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-lg bg-sky-500 text-slate-950 font-black text-xs">Grade A</span>
                      <span className="font-mono font-bold text-sky-600 dark:text-sky-400">70 – 79 pts</span>
                    </div>
                    <strong className="text-slate-900 dark:text-white block font-bold">
                      {isEn ? 'Solid Investment Margin' : 'Sólido Margen'}
                    </strong>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11.5px]">
                      {isEn
                        ? 'Attractive margin (18-27%) with solid underlying registry title characteristics.'
                        : 'Margen comercial atractivo (18-27%) con buenas características registrales y catastrales.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-amber-300 dark:border-amber-500/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-black text-xs">Grade B</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">55 – 69 pts</span>
                    </div>
                    <strong className="text-slate-900 dark:text-white block font-bold">
                      {isEn ? 'Moderate Spread' : 'Margen Moderado'}
                    </strong>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11.5px]">
                      {isEn
                        ? 'Moderate spread (10-17%) or standard 1st call base price with standard capital growth.'
                        : 'Margen moderado (10-17%) o subasta en 1° llamado base con potencial estándar.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Mathematical Point Allocation */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{isEn ? '2. Scoring Factors (100 Points Total)' : '2. Factores de Puntuación (100 Puntos Totales)'}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 block">{isEn ? 'Call Rebate (50 pts)' : 'Rebaja de Ley (50 pts)'}</span>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                      {isEn ? 'Call 1 = 15 · Call 2 = 35 · Call 3 = 50' : '1° = 15 · 2° (-25%) = 35 · 3° (-75%) = 50'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-teal-600 dark:text-teal-400 block">{isEn ? 'Valuation Margin (35 pts)' : 'Margen vs. Avalúo (35 pts)'}</span>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                      {isEn ? '≥40% = 35 · 28-39% = 28 · 18-27% = 18' : '≥40% = 35 · 28-39% = 28 · 18-27% = 18'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-sky-600 dark:text-sky-400 block">{isEn ? 'Liquidity (10 pts)' : 'Liquidez (10 pts)'}</span>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                      {isEn ? 'Homes/Condos = 10 · Commercial = 8 · Lots = 7' : 'Casas/Condominios = 10 · Comercial = 8 · Lotes = 7'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 block">{isEn ? 'Frontage (5 pts)' : 'Frente a Calle (5 pts)'}</span>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                      {isEn ? 'Public Road = 5 · Easement = 2' : 'Calle Pública = 5 · Servidumbre = 2'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Title Security & CPC Article 162 Grounding */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{isEn ? '3. Title Security Tiers & Statutory Lien Purging (Art. 162 CPC)' : '3. Rangos Registrales y Cancelación de Gravámenes (Art. 162 CPC)'}</span>
                </h4>

                <div className="space-y-2.5 text-xs">
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/40 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <strong className="text-emerald-800 dark:text-emerald-300 font-bold">
                        {isEn ? 'Tier 1 · First-Rank Senior Secured Mortgage (1° Grado Hipotecario Preferente)' : 'Nivel 1 · Primer Grado Hipotecario Preferente'}
                      </strong>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {isEn
                        ? 'Senior secured lender executing. Under Article 162 of the Costa Rican Civil Procedure Code, the judicial transfer order automatically mandates the National Registry to cancel and purge all junior mortgages, secondary liens, and subsequent embargos without extra cost.'
                        : 'Acreedor de primer grado ejecutando. Conforme al Artículo 162 del Código Procesal Civil, la adjudicación en firme ordena la cancelación obligatoria en el Registro Nacional de todos los embargos e hipotecas de grado inferior sin costo para el adjudicatario.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-500/40 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <strong className="text-amber-800 dark:text-amber-300 font-bold">
                        {isEn ? 'Tier 2 · Subordinate Second Mortgage (2° Grado Hipotecario)' : 'Nivel 2 · Segundo Grado Hipotecario Subordinado'}
                      </strong>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {isEn
                        ? 'Foreclosure executed by a junior creditor. The senior 1st mortgage may survive or require satisfaction; investors must verify the outstanding senior principal in the case docket.'
                        : 'Ejecución por acreedor de segundo grado. La primera hipoteca preferente puede subsistir o requerir liquidación; se debe verificar el saldo pendiente del primer grado en el expediente.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/40 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                      <strong className="text-rose-800 dark:text-rose-300 font-bold">
                        {isEn ? 'Tier 3 · Complex Judicial Embargo (Embargo en Ejecución)' : 'Nivel 3 · Embargo Judicial en Ejecución'}
                      </strong>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {isEn
                        ? 'Execution stemming from unsecured civil or commercial debt litigation. Any prior registered mortgages retain supreme priority over the auction proceeds.'
                        : 'Ejecución por cobro judicial no hipotecario. Cualquier acreedor hipotecario o derecho previamente inscrito conserva absoluta prioridad registral.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: COURT LOCATIONS & VENUES */}
          {activeTab === 'court_locations' && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs sm:text-sm">
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  {isEn ? 'Judicial Despachos & Hearing Locations' : 'Despachos Judiciales y Sedes de Subasta'}
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  {isEn
                    ? 'Foreclosure auctions are held in the specific courtroom (Juzgado de Cobro Judicial or Juzgado Civil) where the case is docketed. The location is specified on the official edict and in our property dossier.'
                    : 'Las subastas judiciales se llevan a cabo en las instalaciones del juzgado específico donde radica el expediente (Juzgados de Cobro Judicial o Juzgados Civiles). La sede exacta se detalla en cada ficha de nuestra plataforma.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Juzgado Especializado de Cobro de San José</span>
                  </span>
                  <p className="text-slate-600 dark:text-slate-400">Edificio de Tribunales de Justicia, Primer Circuito Judicial, Calle 17, San José.</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Juzgado de Cobro de Santa Ana</span>
                  </span>
                  <p className="text-slate-600 dark:text-slate-400">Plaza Murano, Pozos de Santa Ana, San José.</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Juzgado de Cobro de Alajuela & Grecia</span>
                  </span>
                  <p className="text-slate-600 dark:text-slate-400">Tribunales de Justicia de Alajuela / Grecia Centro.</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Juzgados de Guanacaste & Puntarenas</span>
                  </span>
                  <p className="text-slate-600 dark:text-slate-400">Liberia, Santa Cruz, Nicoya, Garabito (Jacó) y Quepos.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                <p className="font-bold text-slate-900 dark:text-white">
                  {isEn ? 'Virtual Hearings (Audiencias Virtuales):' : 'Modalidad Virtual y Mixta:'}
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  {isEn
                    ? 'Some judicial circuits allow pre-registered bidders to participate remotely via official Poder Judicial videoconferencing platforms (Microsoft Teams Judicial). You must register your electronic judicial locker (Casillero Electrónico) prior to the hearing date.'
                    : 'Algunos juzgados permiten la participación remota mediante las plataformas oficiales de videoconferencia del Poder Judicial (Teams Judicial). Es requisito registrarse previamente e indicar el medio de notificación judicial.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 6: HOW TO USE THE APP */}
          {activeTab === 'app_guide' && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm">
                <p className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  {isEn ? 'REmatrixCR Investor Toolset' : 'Herramientas Profesionales de REmatrixCR'}
                </p>
                <p>
                  {isEn
                    ? 'REmatrixCR provides institutional-grade intelligence on Costa Rican court property auctions with automated daily Gazette ingestion, PostGIS mapping, statutory yield calculators, and due diligence workflows.'
                    : 'REmatrixCR procesa diariamente las publicaciones oficiales del Boletín Judicial para ofrecer análisis geoespacial, cálculo de costos de traspaso estatutarios y listas de debida diligencia.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 w-fit">
                    <Search className="w-4 h-4" />
                  </div>
                  <h5 className="font-bold text-slate-900 dark:text-white text-sm">
                    {isEn ? '1. Catalog & Smart Filters' : '1. Catálogo y Filtros Avanzados'}
                  </h5>
                  <p className="text-slate-600 dark:text-slate-400">
                    {isEn
                      ? 'Filter by property type (Single-Family, Condo, Lot, Agricultural, Commercial), province, price bracket, call stage (1st, 2nd, 3rd), construction status, and road access.'
                      : 'Filtre por categoría de inmueble, provincia, rangos de precio, etapa de remate (1°, 2° o 3°), estado de construcción y acceso a calle pública.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 w-fit">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <h5 className="font-bold text-slate-900 dark:text-white text-sm">
                    {isEn ? '2. Financial Yield Calculator' : '2. Calculadora Financiera de Costos'}
                  </h5>
                  <p className="text-slate-600 dark:text-slate-400">
                    {isEn
                      ? 'Simulate total acquisition costs including statutory 1.50% transfer tax (Ley 7088), registry stamps (~0.84%), and notary protocolization fees (1.25%) to calculate net ROI and IRR.'
                      : 'Simula el costo total de traspaso incluyendo impuesto de traspaso (Ley 7088 - 1.50%), timbres registrales (~0.84%) y honorarios notariales para obtener el ROI neto.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 w-fit">
                    <Compass className="w-4 h-4" />
                  </div>
                  <h5 className="font-bold text-slate-900 dark:text-white text-sm">
                    {isEn ? '3. PostGIS Map Explorer' : '3. Mapa Geoespacial PostGIS'}
                  </h5>
                  <p className="text-slate-600 dark:text-slate-400">
                    {isEn
                      ? 'Visualize all active foreclosure properties mapped by district and cantonal centroids with quick inspection popups and centroid disclaimers.'
                      : 'Visualice todas las propiedades georreferenciadas con notas aclaratorias de centroides distritales para consultar el Plano Catastrado.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 w-fit">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <h5 className="font-bold text-slate-900 dark:text-white text-sm">
                    {isEn ? '4. Calendar & Watchlist' : '4. Calendario y Lista Privada'}
                  </h5>
                  <p className="text-slate-600 dark:text-slate-400">
                    {isEn
                      ? 'Sync auction dates directly to Google Calendar and Apple/Outlook (.ics), save properties to your watchlist, and record private due diligence notes.'
                      : 'Sincronice las fechas de subasta a Google Calendar y Apple/Outlook (.ics), guarde remates en favoritos y guarde notas privadas de inspección.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: LEGAL DISCLAIMER & TERMS */}
          {activeTab === 'legal_disclaimer' && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              {/* Comprehensive Disclaimer Header */}
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-500/40 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                  <Scale className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>{t.disclaimer.comprehensive.title}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {t.disclaimer.comprehensive.p1}
                </p>
              </div>

              {/* Informational Tool & No Warranty */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs sm:text-sm">
                  <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{isEn ? 'Automated Informational Tool & Warranty Disclaimer' : 'Herramienta Informativa y Ausencia de Garantías'}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t.disclaimer.comprehensive.p2}
                </p>
              </div>

              {/* User Responsibility Alert */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-500/40 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-950 dark:text-amber-200 font-bold text-xs sm:text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>{t.disclaimer.comprehensive.userResponsibilityTitle}</span>
                </div>
                <p className="text-xs sm:text-sm text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                  {t.disclaimer.comprehensive.userResponsibilityBody}
                </p>
              </div>

              {/* Limitation of Liability */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs sm:text-sm">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <span>{t.disclaimer.comprehensive.liabilityTitle}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t.disclaimer.comprehensive.liabilityBody}
                </p>
              </div>

              {/* Action Link to dedicated /terms page */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-slate-600 dark:text-slate-400">
                  {isEn ? 'For full printable legal terms & official registry links:' : 'Para consultar el documento legal completo e imprimirlo:'}
                </span>
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-sm shrink-0"
                >
                  <span>{isEn ? 'Open Full Terms Page' : 'Abrir Página de Términos'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* TAB 8: FAQ */}
          {activeTab === 'faq' && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{isEn ? 'Can a foreigner purchase foreclosure properties in Costa Rica?' : '¿Puede un extranjero comprar remates en Costa Rica?'}</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {isEn
                    ? 'Yes. Foreigners have equal constitutional rights to own private titled property in Costa Rica (Article 19 of the Constitution). You only need a valid passport or DIMEX to participate in the auction and receive legal title.'
                    : 'Sí. El artículo 19 de la Constitución Política de Costa Rica otorga a los extranjeros los mismos derechos que a los nacionales en materia de propiedad privada. Solo se requiere pasaporte vigente o DIMEX.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{isEn ? 'What happens if the foreclosed property is currently occupied?' : '¿Qué ocurre si el inmueble rematado está ocupado?'}</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {isEn
                    ? 'Under Article 162 of the Civil Procedure Code, the buyer has the legal right to request an immediate Court Order of Possession (Puesta en Posesión Judicial). The court orders the eviction of occupants with the assistance of the Public Force (Fuerza Pública).'
                    : 'Según el Artículo 162 del Código Procesal Civil, el adjudicatario tiene derecho a solicitar la Puesta en Posesión Judicial inmediata. El tribunal ordena el desalojo y entrega física del inmueble con auxilio de la Fuerza Pública.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{isEn ? 'Are back taxes or municipal fees wiped out?' : '¿Se cancelan las deudas municipales acumuladas?'}</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {isEn
                    ? 'Judicial mortgage liens are purged under Art. 160 CPC, but municipal property taxes (Impuestos de Bienes Inmuebles) attach directly to the land. You should verify tax solvency at the local municipality during your due diligence.'
                    : 'Los gravámenes hipotecarios posteriores se purgan (Art. 160 CPC), pero los impuestos municipales de bienes inmuebles gravan directamente la finca. Debe revisarse el saldo municipal antes de la subasta.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{isEn ? 'What happens if there is an appeal or objection by the debtor/owner?' : '¿Qué sucede si el demandado o dueño apela o presenta un recurso?'}</span>
                </h4>
                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
                  <p>
                    {isEn
                      ? 'The debtor/owner has the statutory right under the Civil Procedure Code (Ley N° 9342) to file procedural appeals (recurso de apelación) or claims of defective notification (incidente de nulidad).'
                      : 'El deudor o propietario tiene derecho procesal a interponer recursos de apelación o incidentes de nulidad (por ejemplo, alegando defectos en la notificación previa al remate).'}
                  </p>
                  <ul className="space-y-1.5 pl-2">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                      <span>
                        <strong>{isEn ? 'Devolutive Effect:' : 'Efecto Devolutivo:'}</strong>{' '}
                        {isEn
                          ? 'Under Costa Rican foreclosure law, appeals are generally admitted with devolutive effect, meaning the auction continues without suspension unless the court specifically orders a stay.'
                          : 'En ejecuciones hipotecarias, los recursos se tramitan ordinariamente con efecto devolutivo, por lo que no suspenden el trámite del remate salvo resolución cautelar expresa.'}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                      <span>
                        <strong>{isEn ? 'Investor Capital Protection:' : 'Protección Total de Fondos:'}</strong>{' '}
                        {isEn
                          ? 'If an auction is ever annulled by the court due to a procedural defect caused by the bank or tribunal, 100% of your deposited funds (the 50% deposit and final balance) are promptly refunded by the court. The buyer bears zero liability for lawsuit errors.'
                          : 'Si un remate llegara a anularse por un defecto procesal imputable al acreedor o al despacho, el 100% de los fondos depositados (postura y saldo) son reintegrados íntegramente por el juzgado. El adjudicatario no asume responsabilidad patrimonial.'}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                      <span>
                        <strong>{isEn ? 'Timeline Impact:' : 'Impacto en Tiempos:'}</strong>{' '}
                        {isEn
                          ? 'If an appeal is lodged, it may temporarily delay the final protocolization deed by ~2 to 6 months while the Superior Court resolves the motion.'
                          : 'Una apelación puede diferir la entrega de la escritura de protocolización en firme entre 2 y 6 meses mientras el Tribunal Superior resuelve el recurso.'}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{isEn ? 'What are the closing and title registration costs for purchasing at auction?' : '¿Cuáles son los costos de cierre e inscripción para un remate?'}</span>
                </h4>
                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
                  <p>
                    {isEn
                      ? 'In a judicial foreclosure, the winning bidder (adjudicatario) is legally responsible for 100% of the closing and registration costs. A standard closing budget is approximately 3.50% to 4.00% of the adjudicated price:'
                      : 'En las subastas judiciales, el adjudicatario asume el 100% de los costos de protocolización e inscripción. El presupuesto estimado de cierre oscila entre el 3.50% y el 4.00% del valor adjudicado:'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="font-bold text-slate-900 dark:text-slate-200 block">
                        1. {isEn ? 'Property Transfer Tax (Ley 7088):' : 'Impuesto de Transferencia (Ley 7088):'}
                      </span>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">1.50%</p>
                      <p className="text-[10px] text-slate-500">{isEn ? 'Calculated on adjudicated price or fiscal valuation.' : 'Calculado sobre el valor adjudicado o valor fiscal.'}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="font-bold text-slate-900 dark:text-slate-200 block">
                        2. {isEn ? 'National Registry & Legal Stamps:' : 'Timbres Registrales y Fiscales:'}
                      </span>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">~0.84%</p>
                      <p className="text-[10px] text-slate-500">{isEn ? 'Registry (0.50%), Fiscal, Bar Association, and Education stamps.' : 'Registro (0.50%), Fiscal, Abogados y Educación y Cultura.'}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="font-bold text-slate-900 dark:text-slate-200 block">
                        3. {isEn ? 'Notary Protocolization Fees:' : 'Honorarios de Protocolización Notarial:'}
                      </span>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">~1.25% - 1.50%</p>
                      <p className="text-[10px] text-slate-500">{isEn ? 'Regulated by the official Costa Rican Notary Fee Schedule.' : 'Regulado por el arancel oficial del Colegio de Abogados.'}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="font-bold text-slate-900 dark:text-slate-200 block">
                        4. {isEn ? 'Municipal Taxes & Services:' : 'Impuestos Municipales y Servicios:'}
                      </span>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">Variable</p>
                      <p className="text-[10px] text-slate-500">{isEn ? 'Back property taxes (0.25% annual) that attach to the land.' : 'Impuesto de Bienes Inmuebles adeudado sobre la finca.'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{isEn ? 'Why are there no photographs or images of the properties?' : '¿Por qué no hay fotografías de las propiedades?'}</span>
                </h4>
                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
                  <p>
                    {isEn
                      ? 'Under Costa Rican foreclosure law, judicial auctions (remates judiciales) are official legal notices published exclusively in text format in the government gazette (Boletín Judicial). The judiciary does not commission real estate photography or host open-house showings prior to auction adjudication.'
                    : 'Conforme a la normativa procesal de Costa Rica, los edictos de remate judicial se publican exclusivamente en formato de texto legal en el Boletín Judicial de la Imprenta Nacional. El Poder Judicial no comisiona fotografías comerciales ni realiza jornadas de visita guiada previas a la subasta.'}
                  </p>
                  <ul className="space-y-1.5 pl-2">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                      <span>
                        <strong>{isEn ? 'Legal & Cadastral Identification:' : 'Identificación Registral y Catastral:'}</strong>{' '}
                        {isEn
                          ? 'Properties are legally and indisputably identified by their unique Folio Real title number and official Plano Catastrado (Cadastral Survey) archived at the National Registry (Registro Nacional).'
                          : 'Cada finca queda individualizada de manera fehaciente mediante su matrícula de Folio Real y su Plano Catastrado oficial inscrito en el Registro Nacional.'}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                      <span>
                        <strong>{isEn ? 'Certified Characteristics:' : 'Características Legales Certificadas:'}</strong>{' '}
                        {isEn
                          ? 'The official edict certifies registered land area (m²), legal nature (whether it has residential houses, commercial buildings, or is raw land), 4-quadrant boundaries (linderos), and public road frontage.'
                          : 'El edicto judicial certifica la medida superficial (m²), su naturaleza (si posee casa de habitación, edificaciones o es terreno), sus 4 linderos y su condición frente a calle pública.'}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                      <span>
                        <strong>{isEn ? 'Investor On-Site Inspection:' : 'Inspección Física en Campo:'}</strong>{' '}
                        {isEn
                          ? 'Professional investors use the cadastral survey number and local district landmarks to conduct drive-by on-site visual inspections of the property exterior, neighborhood, and access infrastructure prior to bidding.'
                          : 'Los inversionistas utilizan el número de plano catastrado y las señas del expediente para realizar inspecciones visuales en el sitio antes de la subasta y corroborar el estado físico de la propiedad y sus accesos.'}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{isEn ? 'What currency is used in the auction?' : '¿En qué moneda se paga la subasta?'}</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {isEn
                    ? 'The currency (USD $ or CRC ₡) is established by the original mortgage contract and stated in the edict. The 50% deposit and final balance must be paid in the exact currency specified by the court.'
                    : 'La moneda (USD o CRC) viene definida en la escritura de hipoteca y en el edicto. Tanto el 50% de postura legal como el saldo final deben depositarse en la moneda señalada por el tribunal.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
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
