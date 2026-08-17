'use client';

import React, { useState, useEffect } from 'react';
import { Auction } from '@/lib/types/auction';
import { formatCurrency, calculateClosingCosts } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  Calculator,
  DollarSign,
  TrendingUp,
  Percent,
  Calendar,
  AlertCircle,
  Wrench,
  Landmark,
  ShieldCheck,
  Building,
  Receipt,
  Sparkles,
} from 'lucide-react';

interface InvestmentYieldCalculatorProps {
  auction: Auction;
  selectedCall: 1 | 2 | 3;
}

export function InvestmentYieldCalculator({
  auction,
  selectedCall,
}: InvestmentYieldCalculatorProps) {
  // Get base price for the selected call
  const defaultBasePrice =
    selectedCall === 2 && auction.base_price_call_2
      ? auction.base_price_call_2
      : selectedCall === 3 && auction.base_price_call_3
      ? auction.base_price_call_3
      : auction.base_price_call_1;

  const defaultMarketValue =
    auction.estimated_market_value || Math.round(auction.base_price_call_1 * 1.4);

  // Reactive state inputs
  const [targetBid, setTargetBid] = useState<number>(defaultBasePrice);
  const [resaleValue, setResaleValue] = useState<number>(defaultMarketValue);
  const [renovationBudget, setRenovationBudget] = useState<number>(
    auction.currency === 'USD' ? 15000 : 8000000
  );
  const [holdingMonths, setHoldingMonths] = useState<number>(6);
  const [municipalHOABuffer, setMunicipalHOABuffer] = useState<number>(
    auction.currency === 'USD' ? 2500 : 1200000
  );

  // Update target bid when user switches call stage in parent ladder
  useEffect(() => {
    setTargetBid(defaultBasePrice);
  }, [defaultBasePrice]);

  // Costa Rican Statutory Closing Cost Formulas:
  // - 1.50% Impuesto de Traspaso Inmobiliario (Ley 7088)
  // - 0.84% Timbres Registrales (Colegio Abogados, Fiscal, Agrario, Registro Nacional)
  // - 1.25% Honorarios Notariales / Protocolización de Remate (Decreto de Aranceles)
  const transferTax = targetBid * 0.015;
  const registryStamps = targetBid * 0.0084;
  const legalNotaryFees = targetBid * 0.0125;
  const totalClosingFees = transferTax + registryStamps + legalNotaryFees;

  // Day of auction deposit (Postura Legal = 50%)
  const courtDeposit50Pct = targetBid * 0.5;

  // Total Capital Required
  const totalAcquisitionCost =
    targetBid + totalClosingFees + renovationBudget + municipalHOABuffer;

  // Net Profit & Yield Metrics
  const netProfit = resaleValue - totalAcquisitionCost;
  const netROI = totalAcquisitionCost > 0 ? (netProfit / totalAcquisitionCost) * 100 : 0;

  // Annualized Yield (IRR estimation based on holding months)
  const annualizedROI =
    holdingMonths > 0 && netROI > -100
      ? (Math.pow(1 + Math.max(-0.99, netROI / 100), 12 / holdingMonths) - 1) * 100
      : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-800/50 text-emerald-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Calculadora de Rendimiento y Costos de Cierre (CR)
            </h2>
            <p className="text-xs text-slate-400">
              Modelo financiero con aranceles notariales, Ley 7088 y depósito de postura legal.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Base para:</span>
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 font-mono">
            {selectedCall}° Señalamiento
          </span>
        </div>
      </div>

      {/* Top KPI Results Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Cost */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
            Costo Total Adquisición
          </p>
          <p className="text-lg sm:text-xl font-extrabold text-white font-mono">
            {formatCurrency(totalAcquisitionCost, auction.currency)}
          </p>
          <p className="text-[10px] text-slate-500">Postura + Gastos + Mejoras</p>
        </div>

        {/* Net Profit */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
            Ganancia Neta Proyectada
          </p>
          <p
            className={`text-lg sm:text-xl font-extrabold font-mono ${
              netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {netProfit >= 0 ? '+' : ''}
            {formatCurrency(netProfit, auction.currency)}
          </p>
          <p className="text-[10px] text-slate-500">Sobre valor de reventa</p>
        </div>

        {/* Net ROI */}
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/40 space-y-1">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            ROI Neto Proyectado
          </p>
          <p className="text-xl sm:text-2xl font-black text-emerald-300 font-mono">
            {netROI >= 0 ? '+' : ''}
            {Math.round(netROI * 10) / 10}%
          </p>
          <p className="text-[10px] text-emerald-500/80">Retorno sobre capital total</p>
        </div>

        {/* Annualized Yield */}
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/40 space-y-1">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            TIR / ROI Anualizado
          </p>
          <p className="text-xl sm:text-2xl font-black text-amber-300 font-mono">
            {annualizedROI >= 0 ? '+' : ''}
            {Math.round(annualizedROI * 10) / 10}%
          </p>
          <p className="text-[10px] text-amber-500/80">
            Horizonte de {holdingMonths} meses
          </p>
        </div>
      </div>

      {/* Interactive Sliders & Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
        {/* Left Column: Bid & Resale Inputs */}
        <div className="space-y-4 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Parámetros de Puja y Reventa
          </h3>

          {/* Target Bid Amount */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-semibold text-slate-300">Monto de Postura / Puja:</label>
              <span className="font-mono font-bold text-emerald-400">
                {formatCurrency(targetBid, auction.currency)}
              </span>
            </div>
            <Input
              type="number"
              value={targetBid}
              onChange={(e) => setTargetBid(Math.max(0, Number(e.target.value)))}
              className="text-xs font-mono font-bold"
            />
            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setTargetBid(defaultBasePrice)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10.5px] text-slate-300 font-medium transition-colors"
              >
                Base Exacta ({formatCurrency(defaultBasePrice, auction.currency)})
              </button>
              <button
                type="button"
                onClick={() => setTargetBid(Math.round(defaultBasePrice * 1.05))}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10.5px] text-slate-300 font-medium transition-colors"
              >
                +5%
              </button>
              <button
                type="button"
                onClick={() => setTargetBid(Math.round(defaultBasePrice * 1.1))}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10.5px] text-slate-300 font-medium transition-colors"
              >
                +10%
              </button>
            </div>
          </div>

          {/* Expected Resale / Market Value */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-semibold text-slate-300">Valor de Reventa / Salida Estimado:</label>
              <span className="font-mono font-bold text-slate-200">
                {formatCurrency(resaleValue, auction.currency)}
              </span>
            </div>
            <Input
              type="number"
              value={resaleValue}
              onChange={(e) => setResaleValue(Math.max(0, Number(e.target.value)))}
              className="text-xs font-mono"
            />
          </div>

          {/* Holding Duration */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-semibold text-slate-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Horizonte de Inversión / Venta:
              </label>
              <span className="font-mono font-bold text-amber-400">{holdingMonths} meses</span>
            </div>
            <div className="flex items-center gap-2">
              {[3, 6, 9, 12, 18, 24].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setHoldingMonths(m)}
                  className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all ${
                    holdingMonths === m
                      ? 'bg-amber-600 text-slate-950 font-black shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Remediations & Legal Reserves */}
        <div className="space-y-4 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Wrench className="w-4 h-4 text-emerald-400" />
            Remodelación y Reservas Contingentes
          </h3>

          {/* Renovation Budget */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-semibold text-slate-300">Presupuesto de Remodelación / Puesta a Punto:</label>
              <span className="font-mono font-bold text-slate-200">
                {formatCurrency(renovationBudget, auction.currency)}
              </span>
            </div>
            <Input
              type="number"
              value={renovationBudget}
              onChange={(e) => setRenovationBudget(Math.max(0, Number(e.target.value)))}
              className="text-xs font-mono"
            />
          </div>

          {/* Municipal / HOA Debt Buffer */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-semibold text-slate-300">
                Reserva Impuestos Municipales / Cuotas Condominio:
              </label>
              <span className="font-mono font-bold text-slate-200">
                {formatCurrency(municipalHOABuffer, auction.currency)}
              </span>
            </div>
            <Input
              type="number"
              value={municipalHOABuffer}
              onChange={(e) => setMunicipalHOABuffer(Math.max(0, Number(e.target.value)))}
              className="text-xs font-mono"
            />
            <p className="text-[10px] text-slate-500">
              Cubre deudas preferentes acumuladas de bienes inmuebles o mantenimiento.
            </p>
          </div>

          {/* Day of auction deposit requirement */}
          <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl space-y-1 text-xs">
            <div className="flex justify-between items-center font-bold">
              <span className="text-emerald-300">Depósito para Postular (50%):</span>
              <span className="text-emerald-300 font-mono">
                {formatCurrency(courtDeposit50Pct, auction.currency)}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Requisito del juzgado para emitir ofertas. El restante 50% se cancela en 3 días hábiles tras la adjudicación.
            </p>
          </div>
        </div>
      </div>

      {/* Statutory Costa Rica Tax & Stamp Breakdown Table */}
      <div className="pt-2 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Receipt className="w-4 h-4 text-emerald-400" />
          Desglose Normativo de Traspaso y Gastos Legales (Costa Rica)
        </h3>

        <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800 text-xs">
          <div className="p-3 flex justify-between items-center">
            <div>
              <p className="font-medium text-slate-200">
                Impuesto de Traspaso de Bienes Inmuebles (1.50%)
              </p>
              <p className="text-[10.5px] text-slate-500">Ley N° 7088 sobre el valor de adjudicación.</p>
            </div>
            <span className="font-mono font-bold text-slate-200">
              {formatCurrency(transferTax, auction.currency)}
            </span>
          </div>

          <div className="p-3 flex justify-between items-center">
            <div>
              <p className="font-medium text-slate-200">
                Timbres de Registro Nacional y Fiscales (~0.84%)
              </p>
              <p className="text-[10.5px] text-slate-500">
                Timbre Agrario, Colegio de Abogados, Archivo Nacional y Registro Público.
              </p>
            </div>
            <span className="font-mono font-bold text-slate-200">
              {formatCurrency(registryStamps, auction.currency)}
            </span>
          </div>

          <div className="p-3 flex justify-between items-center">
            <div>
              <p className="font-medium text-slate-200">
                Honorarios de Protocolización de Remate (~1.25%)
              </p>
              <p className="text-[10.5px] text-slate-500">
                Arancel Notarial de Costa Rica por protocolización del auto de adjudicación.
              </p>
            </div>
            <span className="font-mono font-bold text-slate-200">
              {formatCurrency(legalNotaryFees, auction.currency)}
            </span>
          </div>

          <div className="p-3.5 bg-slate-900 flex justify-between items-center font-bold text-sm">
            <span className="text-white">Total Gastos de Cierre e Impuestos:</span>
            <span className="font-mono text-emerald-400">
              {formatCurrency(totalClosingFees, auction.currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
