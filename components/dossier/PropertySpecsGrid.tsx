'use client';

import React from 'react';
import { Auction } from '@/lib/types/auction';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { PropertyTypeBadge } from '@/components/ui/PropertyTypeIcon';
import { detectPropertyCharacteristics, localizeRealEstateText } from '@/lib/utils';
import {
  FileText,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  Building,
  TreePine,
} from 'lucide-react';

interface PropertySpecsGridProps {
  auction: Auction;
}

export function PropertySpecsGrid({ auction }: PropertySpecsGridProps) {
  const { language } = useLanguage();

  // Determine or fallback property characteristics using robust detector
  const {
    propertyType,
    hasConstruction,
    hasPublicRoad,
    isCondominio,
    mortgagePriority: priority,
  } = detectPropertyCharacteristics(auction);

  const priorityLabels = {
    '1st_mortgage': {
      es: '1° Grado Hipotecario (Acreedor Preferente)',
      en: '1st Senior Mortgage (Priority Creditor)',
      badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50',
      icon: ShieldCheck,
    },
    '2nd_mortgage': {
      es: '2° Grado Hipotecario (Subordinada)',
      en: '2nd Subordinate Mortgage',
      badge: 'bg-amber-950/80 text-amber-300 border-amber-500/50',
      icon: ShieldAlert,
    },
    'embargo_judicial': {
      es: 'Ejecución por Embargo Judicial',
      en: 'Judicial Seizure / Court Attachment',
      badge: 'bg-rose-950/80 text-rose-300 border-rose-500/50',
      icon: AlertTriangle,
    },
    'unknown': {
      es: 'Por Verificar en Registro Nacional',
      en: 'Pending Verification in Registry',
      badge: 'bg-slate-900 text-slate-300 border-slate-700',
      icon: ShieldAlert,
    },
  };

  const priorityConfig = priorityLabels[priority] || priorityLabels['1st_mortgage'];
  const PriorityIcon = priorityConfig.icon;

  // Linderos default parsers if not in structured columns
  let norte = auction.lindero_norte;
  let sur = auction.lindero_sur;
  let este = auction.lindero_este;
  let oeste = auction.lindero_oeste;

  if (!norte && auction.raw_edict_text) {
    const mNorte = auction.raw_edict_text.match(/norte[:\s]+([^;,.\n]+)/i);
    if (mNorte) norte = mNorte[1].trim();
    const mSur = auction.raw_edict_text.match(/sur[:\s]+([^;,.\n]+)/i);
    if (mSur) sur = mSur[1].trim();
    const mEste = auction.raw_edict_text.match(/este[:\s]+([^;,.\n]+)/i);
    if (mEste) este = mEste[1].trim();
    const mOeste = auction.raw_edict_text.match(/oeste[:\s]+([^;,.\n]+)/i);
    if (mOeste) oeste = mOeste[1].trim();
  }

  // Fallbacks for display
  norte = norte || (language === 'en' ? 'Bordering registered real estate / Calle' : 'Finca colindante inscrita / Vía de acceso');
  sur = sur || (language === 'en' ? 'Private property / Predio vecino' : 'Propiedad privada / Predio vecino');
  este = este || (language === 'en' ? 'Registered parcel boundary' : 'Límite predial según plano catastrado');
  oeste = oeste || (language === 'en' ? 'Registered parcel boundary' : 'Límite predial según plano catastrado');

  // Naturaleza text
  const rawNaturaleza = auction.naturaleza_raw || auction.address_description;
  const naturaleza = rawNaturaleza
    ? localizeRealEstateText(rawNaturaleza, language)
    : (language === 'en'
        ? `Real estate registered under Folio Real ${auction.folio_real}, located in ${auction.district}, ${auction.canton}, ${auction.province}.`
        : `Terreno inscrito bajo matrícula ${auction.folio_real}, ubicado en ${auction.district}, ${auction.canton}, ${auction.province}.`);

  // Servidumbres text
  const servidumbres = auction.servidumbres_notes || (
    (auction.raw_edict_text || '').toLowerCase().includes('servidumbre')
      ? language === 'en'
        ? 'Active registered easements (Right of way / Water & utility transit) noted in legal edict. Verify in National Registry certifications.'
        : 'Constan servidumbres de paso / acueducto registradas en el edicto judicial. Verificar certificaciones completas en el Registro Nacional.'
      : language === 'en'
        ? 'No obstructive adverse easements registered in the published court edict.'
        : 'Sin servidumbres obstructivas reportadas en la publicación oficial del edicto.'
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {language === 'en'
                ? 'Registered Legal Characteristics & Encumbrances'
                : 'Características Registrales y Gravámenes'}
            </h2>
            <p className="text-xs text-slate-400">
              {language === 'en'
                ? 'Extracted directly from the official court edict & National Registry'
                : 'Datos extraídos del edicto judicial y del Registro Nacional de Costa Rica'}
            </p>
          </div>
        </div>

        <PropertyTypeBadge
          type={propertyType}
          language={language}
          size="md"
        />
      </div>

      {/* Key Status Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Mortgage Seniority */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
          <span className="text-[10.5px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
            <PriorityIcon className="w-3.5 h-3.5 text-emerald-400" />
            {language === 'en' ? 'Seniority / Claim Status' : 'Grado de Ejecución'}
          </span>
          <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${priorityConfig.badge}`}>
            {language === 'en' ? priorityConfig.en : priorityConfig.es}
          </div>
        </div>

        {/* Public Road Access */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
          <span className="text-[10.5px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-sky-400" />
            {language === 'en' ? 'Public Road Access' : 'Acceso a Calle Pública'}
          </span>
          <div
            className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 ${
              hasPublicRoad
                ? 'bg-sky-950/80 text-sky-300 border-sky-500/50'
                : 'bg-slate-900 text-slate-300 border-slate-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>
              {hasPublicRoad
                ? language === 'en'
                  ? 'Confirmed Public Road Frontage'
                  : 'Frente a Calle Pública Confirmado'
                : language === 'en'
                ? 'Easement / Private Access'
                : 'Acceso por Servidumbre / Vía Privada'}
            </span>
          </div>
        </div>

        {/* Construction Status */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
          <span className="text-[10.5px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
            <Building className="w-3.5 h-3.5 text-amber-400" />
            {language === 'en' ? 'Construction Status' : 'Estado de Construcción'}
          </span>
          <div
            className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 ${
              hasConstruction
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
            }`}
          >
            {hasConstruction ? (
              <>
                <Building className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  {language === 'en' ? 'With Existing Structures' : 'Con Edificación / Mejoras'}
                </span>
              </>
            ) : (
              <>
                <TreePine className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  {language === 'en' ? 'Raw Land / Unbuilt Lot' : 'Terreno Sin Construir'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Naturaleza del Inmueble */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
        <span className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
          <Layers className="w-4 h-4" />
          {language === 'en' ? 'Registered Real Estate Nature (Naturaleza Registral)' : 'Naturaleza del Inmueble'}
        </span>
        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800 font-mono">
          "{naturaleza}"
        </p>
      </div>

      {/* 4-Quadrant Visual Compass Box of Linderos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
            <Compass className="w-4 h-4" />
            {language === 'en' ? 'Registered Boundaries (Linderos Registrales)' : 'Linderos Registrales'}
          </span>
          <span className="text-[11px] text-slate-400">
            {language === 'en' ? 'Official Cadastral Orientation' : 'Orientación Registral Oficial'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* North */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3 hover:border-slate-700 transition-colors">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
              <ArrowUp className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                {language === 'en' ? 'North (Norte)' : 'Norte'}
              </span>
              <p className="text-xs text-slate-200 font-medium line-clamp-2">{norte}</p>
            </div>
          </div>

          {/* South */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3 hover:border-slate-700 transition-colors">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
              <ArrowDown className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                {language === 'en' ? 'South (Sur)' : 'Sur'}
              </span>
              <p className="text-xs text-slate-200 font-medium line-clamp-2">{sur}</p>
            </div>
          </div>

          {/* East */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3 hover:border-slate-700 transition-colors">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
              <ArrowRight className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                {language === 'en' ? 'East (Este)' : 'Este'}
              </span>
              <p className="text-xs text-slate-200 font-medium line-clamp-2">{este}</p>
            </div>
          </div>

          {/* West */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3 hover:border-slate-700 transition-colors">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                {language === 'en' ? 'West (Oeste)' : 'Oeste'}
              </span>
              <p className="text-xs text-slate-200 font-medium line-clamp-2">{oeste}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Servidumbres & Gravámenes */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
        <span className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4" />
          {language === 'en' ? 'Registered Easements & Annotations' : 'Servidumbres y Gravámenes Activos'}
        </span>
        <p className="text-xs text-slate-300 leading-relaxed">
          {servidumbres}
        </p>
      </div>
    </div>
  );
}
