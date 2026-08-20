'use client';

import React, { useState, useEffect } from 'react';
import { Auction } from '@/lib/types/auction';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  ShieldAlert,
  CheckSquare,
  Square,
  AlertTriangle,
  FileCheck2,
  Home,
  Building,
  Landmark,
  Scale,
  ExternalLink,
  Info,
} from 'lucide-react';

interface DueDiligenceChecklistProps {
  auction: Auction;
}

interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  criticality: 'CRÍTICO' | 'ALTO' | 'MEDIO' | 'CRITICAL' | 'HIGH' | 'MEDIUM';
  description: string;
  legalBasis: string;
  actionGuidance: string;
}

export function DueDiligenceChecklist({ auction }: DueDiligenceChecklistProps) {
  const { t, language } = useLanguage();
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});

  const storageKey = `due_diligence_${auction.id}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setCompletedItems(JSON.parse(stored));
      }
    } catch {
      // ignore localStorage errors
    }
  }, [storageKey]);

  const toggleItem = (id: string) => {
    const updated = {
      ...completedItems,
      [id]: !completedItems[id],
    };
    setCompletedItems(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const CHECKLIST_ITEMS: ChecklistItem[] = language === 'es' ? [
    {
      id: 'mortgage_seniority',
      category: 'Gravámenes & Rango Hipotecario',
      title: 'Verificación de Grado Hipotecario (Purga de Gravámenes)',
      criticality: 'CRÍTICO',
      description:
        'Confirmar que el ejecutante es acreedor hipotecario de 1° Grado. En Costa Rica, el remate por hipoteca preferente purga (extingue) automáticamente hipotecas de 2° grado, embargos y anotaciones posteriores.',
      legalBasis: 'Art. 160 Código Procesal Civil y Art. 411 Código Civil',
      actionGuidance:
        'Revisar la certificación literal de gravámenes en el Registro Nacional para descartar hipotecas de grado anterior que no se cancelen con el remate.',
    },
    {
      id: 'cadastral_survey_match',
      category: 'Catastro & Linderos Físicos',
      title: 'Concordancia de Plano Catastrado con Folio Real',
      criticality: 'ALTO',
      description: `Verificar que el plano catastrado (${auction.plano_catastrado || 'indicado en edicto'}) coincida exactamente en cabida (${auction.area_m2} m²), linderos y ubicación con la finca registral ${auction.folio_real}.`,
      legalBasis: 'Ley de Catastro Nacional N° 6545 & Art. 468 Código Civil',
      actionGuidance:
        'Descargar el plano en la base digital del Registro Nacional (SIRI) y verificar que no tenga traslapes o advertencias administrativas.',
    },
    {
      id: 'physical_possession',
      category: 'Posesión Física & Ocupación',
      title: 'Inspección Física y Estado de Ocupación del Inmueble',
      criticality: 'CRÍTICO',
      description:
        'Determinar si el inmueble está ocupado por el deudor, inquilinos con contrato inscrito, o precaristas. Si está ocupado, se requerirá solicitar la puesta en posesión judicial (desahucio judicial).',
      legalBasis: 'Art. 162 Código Procesal Civil (Puesta en Posesión)',
      actionGuidance:
        'Realizar visita de campo al inmueble para evaluar el estado de conservación física y entablar diálogo preliminar.',
    },
    {
      id: 'municipal_dues',
      category: 'Obligaciones Municipales & Condominales',
      title: 'Solvencia de Impuestos Municipales y Cuotas Condominales',
      criticality: 'MEDIO',
      description:
        'Verificar si existen deudas acumuladas de Impuesto sobre Bienes Inmuebles (IBI) en la Municipalidad de ' +
        auction.canton +
        (auction.property_category === 'Condo' ? ' o cuotas condominales de mantenimiento atrasadas.' : '.'),
      legalBasis: 'Ley 7509 (Impuesto sobre Bienes Inmuebles) y Ley 7933 (Propiedad en Condominio)',
      actionGuidance:
        'Solicitar estado de cuenta en la municipalidad respectiva y consultar a la administración del condominio.',
    },
    {
      id: 'pending_appeals',
      category: 'Expediente Judicial',
      title: 'Revisión de Incidentes de Nulidad o Suspensiones en Juzgado',
      criticality: 'ALTO',
      description:
        'Revisar en el Sistema de Gestión Judicial si el demandado ha presentado incidentes de nulidad de notificación, recursos de apelación o tercerías que puedan suspender el remate a última hora.',
      legalBasis: 'Art. 154 Código Procesal Civil',
      actionGuidance:
        'Consultar el expediente digital (' + auction.expediente_number + ') 24 horas antes de la subasta para confirmar que el remate sigue en pie.',
    },
  ] : [
    {
      id: 'mortgage_seniority',
      category: 'Liens & Mortgage Seniority',
      title: 'Mortgage Seniority Verification (Lien Purge & Extinction)',
      criticality: 'CRITICAL',
      description:
        'Confirm that the foreclosing plaintiff holds 1st-degree mortgage seniority. In Costa Rica, an auction triggered by a first mortgage legally extinguishes all junior mortgages and lower-ranked attachments.',
      legalBasis: 'Art. 160 Civil Procedure Code & Art. 411 Civil Code',
      actionGuidance:
        'Verify title abstract on National Registry to confirm no senior liens precede this foreclosure.',
    },
    {
      id: 'cadastral_survey_match',
      category: 'Survey & Cadastral Match',
      title: 'Cadastral Survey Concordance with Property Registry',
      criticality: 'HIGH',
      description: `Verify that the official registered survey (${auction.plano_catastrado || 'indicated in docket'}) matches the registered area (${auction.area_m2} m²) and boundary descriptions for folio ${auction.folio_real}.`,
      legalBasis: 'National Cadastre Act No. 6545 & Art. 468 Civil Code',
      actionGuidance:
        'Inspect digital survey map in National Registry (SIRI) to verify absence of overlaps or administrative boundary conflicts.',
    },
    {
      id: 'physical_possession',
      category: 'Physical Possession & Tenancy',
      title: 'Physical Site Inspection & Occupancy Status',
      criticality: 'CRITICAL',
      description:
        'Determine whether the premises are occupied by debtor or tenants. If occupied, petitioning the court for a judicial writ of possession will be required upon final title recording.',
      legalBasis: 'Art. 162 Civil Procedure Code (Judicial Writ of Possession)',
      actionGuidance:
        'Perform in-person site visit to inspect building structural integrity and occupancy condition.',
    },
    {
      id: 'municipal_dues',
      category: 'Municipal Taxes & HOA Dues',
      title: 'Municipal Property Tax & Condominium Dues Audit',
      criticality: 'MEDIUM',
      description:
        'Verify unpaid municipal property tax balances with the Municipality of ' +
        auction.canton +
        (auction.property_category === 'Condo' ? ' or delinquent HOA maintenance dues.' : '.'),
      legalBasis: 'Act 7509 (Real Estate Property Tax) & Act 7933 (Condominium Property Act)',
      actionGuidance:
        'Request account balance with local municipality and verify with condo HOA administration.',
    },
    {
      id: 'pending_appeals',
      category: 'Judicial Docket Audit',
      title: 'Audit of Docket for Motions of Nullity or Injunctions',
      criticality: 'HIGH',
      description:
        'Review the electronic court docket to ensure debtor has not filed last-minute motions to nullify notification or 3rd-party claims that could stay the auction.',
      legalBasis: 'Art. 154 Civil Procedure Code',
      actionGuidance:
        'Check digital court file (' + auction.expediente_number + ') 24 hours prior to auction to confirm proceeding is active.',
    },
  ];

  const completedCount = CHECKLIST_ITEMS.filter((i) => completedItems[i.id]).length;
  const progressPct = Math.round((completedCount / CHECKLIST_ITEMS.length) * 100);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-md dark:shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t.dossier.dueDiligenceChecklist}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.dossier.dueDiligenceDesc}
            </p>
          </div>
        </div>

        {/* Progress Bar & Counter */}
        <div className="bg-slate-50 dark:bg-slate-950 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1 min-w-[180px]">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-slate-500 dark:text-slate-400">{t.dossier.checklistProgress}:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono">
              {completedCount} / {CHECKLIST_ITEMS.length} ({progressPct}%)
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Compact In-App Notice & Due Diligence Banner */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 text-xs flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5 flex-1">
          <p className="font-bold text-amber-900 dark:text-amber-200">
            {t.disclaimer.compact.title}
          </p>
          <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed text-[11.5px]">
            {t.disclaimer.compact.body}
          </p>
        </div>
      </div>

      {/* Checklist Items List */}
      <div className="space-y-3">
        {CHECKLIST_ITEMS.map((item) => {
          const isDone = Boolean(completedItems[item.id]);

          return (
            <div
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                isDone
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/50 shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-950'
              }`}
            >
              <div className="flex items-start gap-3.5">
                {/* Checkbox Icon */}
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors" />
                  )}
                </div>

                {/* Content */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      {item.category}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        item.criticality === 'CRÍTICO' || item.criticality === 'CRITICAL'
                          ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800/80'
                          : item.criticality === 'ALTO' || item.criticality === 'HIGH'
                          ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800/80'
                          : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {item.criticality}
                    </span>
                  </div>

                  <h3
                    className={`text-sm font-bold tracking-tight transition-colors ${
                      isDone ? 'text-emerald-800 dark:text-emerald-200 line-through' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 text-[11px]">
                    <div className="bg-white dark:bg-slate-900/90 p-2 rounded-xl border border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400">
                      <strong className="text-slate-900 dark:text-slate-300 block">{language === 'es' ? 'Fundamento Jurídico:' : 'Legal Basis:'}</strong>
                      <span>{item.legalBasis}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900/90 p-2 rounded-xl border border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400">
                      <strong className="text-slate-900 dark:text-slate-300 block">{language === 'es' ? 'Acción Recomendada:' : 'Recommended Action:'}</strong>
                      <span>{item.actionGuidance}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
