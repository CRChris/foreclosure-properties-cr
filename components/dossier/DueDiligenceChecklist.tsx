'use client';

import React, { useState, useEffect } from 'react';
import { Auction } from '@/lib/types/auction';
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
  criticality: 'CRÍTICO' | 'ALTO' | 'MEDIO';
  description: string;
  legalBasis: string;
  actionGuidance: string;
}

export function DueDiligenceChecklist({ auction }: DueDiligenceChecklistProps) {
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

  const CHECKLIST_ITEMS: ChecklistItem[] = [
    {
      id: 'mortgage_priority',
      category: 'Prioridad Registral & Gravámenes',
      title: 'Verificación de Grado Hipotecario (1° vs 2° Hipoteca)',
      criticality: 'CRÍTICO',
      description:
        'Confirmar si el banco ejecutante remata en 1° Grado Hipotecario. En Costa Rica, el remate por primer acreedor hipotecario purga y cancela todos los gravámenes y embargos posteriores (Art. 160 CPC). Si el remate es por 2° hipoteca, la 1° hipoteca subsiste a cargo del adjudicatario.',
      legalBasis: 'Art. 160 y 161 del Código Procesal Civil de Costa Rica',
      actionGuidance:
        'Solicitar estudio registral actualizado del Folio Real en el Registro Nacional para verificar el orden cronológico de las hipotecas.',
    },
    {
      id: 'cadastral_match',
      category: 'Catastro & Linderos',
      title: 'Concordancia Plano Catastrado vs. Folio Real',
      criticality: 'ALTO',
      description:
        'Comprobar que el área descrita en el Folio Real coincida con el Plano Catastrado oficial y que no existan inconsistencias catastrales o traslapes con fincas colindantes.',
      legalBasis: 'Ley de Catastro Nacional N° 6545 y Sistema SIRI',
      actionGuidance: `Descargar el plano catastrado (${auction.plano_catastrado || 'Plano Registrado'}) y contrastarlo con imágenes satelitales y mojones físicos en el terreno.`,
    },
    {
      id: 'possession_status',
      category: 'Posesión Física & Desalojo',
      title: 'Inspección Perimetral y Estado de Ocupación',
      criticality: 'ALTO',
      description:
        'Los remates judiciales se venden "ad corpus" (en el estado material en que se encuentran) sin derecho a inspección previa del interior. En caso de estar ocupado por el deudor o terceros, el adjudicatario debe solicitar la puesta en posesión judicial al despacho.',
      legalBasis: 'Art. 162 del Código Procesal Civil (Puesta en Posesión)',
      actionGuidance:
        'Realizar visita física exterior al inmueble para evaluar el estado de conservación de la fachada, accesos y ocupación real.',
    },
    {
      id: 'municipal_hoa_debt',
      category: 'Obligaciones Preferentes & Municipales',
      title: 'Revisión de Impuestos Territoriales y Cuotas Condominales',
      criticality: 'MEDIO',
      description:
        'Las deudas de Impuesto sobre Bienes Inmuebles (IBI) de la Municipalidad y las cuotas de mantenimiento en propiedades en condominio constituyen gravámenes preferentes de ley que persiguen a la finca.',
      legalBasis: 'Ley N° 7509 (Bienes Inmuebles) y Ley N° 7933 (Propiedad en Condominio)',
      actionGuidance: `Consultar estado de cuenta en la Municipalidad de ${auction.canton} y con la administración del condominio/residencial.`,
    },
  ];

  const totalItems = CHECKLIST_ITEMS.length;
  const completedCount = Object.values(completedItems).filter(Boolean).length;
  const progressPct = Math.round((completedCount / totalItems) * 100);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
      {/* Header & Progress Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-950/80 border border-amber-800/50 text-amber-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Protocolo de Debida Diligencia Legal (Costa Rica)
            </h2>
            <p className="text-xs text-slate-400">
              Verificaciones críticas antes de depositar la postura legal y pujar en el juzgado.
            </p>
          </div>
        </div>

        {/* Progress Bar & Counter */}
        <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className="space-y-1 text-right">
            <p className="text-[10px] uppercase font-bold text-slate-400">Progreso Verificación</p>
            <p className="text-xs font-bold text-emerald-400 font-mono">
              {completedCount} de {totalItems} ítems ({progressPct}%)
            </p>
          </div>
          <div className="w-12 h-12 relative flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-emerald-500 transition-all duration-500 ease-out"
                strokeDasharray={`${progressPct}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-[10px] font-black text-white font-mono">
              {progressPct}%
            </span>
          </div>
        </div>
      </div>

      {/* Checklist items */}
      <div className="space-y-4">
        {CHECKLIST_ITEMS.map((item) => {
          const isDone = !!completedItems[item.id];
          return (
            <div
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                isDone
                  ? 'bg-emerald-950/20 border-emerald-800/60 shadow-sm'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950/90'
              }`}
            >
              <div className="flex items-start gap-3.5">
                {/* Checkbox Icon */}
                <button
                  type="button"
                  className={`mt-0.5 shrink-0 transition-transform ${
                    isDone ? 'text-emerald-400 scale-110' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {isDone ? (
                    <CheckSquare className="w-5 h-5 fill-emerald-950 text-emerald-400" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>

                {/* Content */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-white flex items-center gap-2">
                      <span className={isDone ? 'line-through text-slate-400' : ''}>
                        {item.title}
                      </span>
                    </span>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full ${
                          item.criticality === 'CRÍTICO'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                            : item.criticality === 'ALTO'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                            : 'bg-sky-950 text-sky-300 border border-sky-800/60'
                        }`}
                      >
                        {item.criticality}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div className="p-2 rounded bg-slate-900/90 border border-slate-800 flex items-center gap-1.5 text-slate-400">
                      <Scale className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">
                        <strong>Base Legal:</strong> {item.legalBasis}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-slate-900/90 border border-slate-800 flex items-center gap-1.5 text-slate-300">
                      <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">
                        <strong>Acción:</strong> {item.actionGuidance}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Safety Warning */}
      <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3 text-xs text-slate-400">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-200">Recomendación para Inversionistas Judiciales:</p>
          <p>
            Siempre verifique el expediente físico o electrónico en el sistema <em>Gestión en Línea</em> del Poder Judicial antes de constituir el depósito judicial.
          </p>
        </div>
      </div>
    </div>
  );
}
