'use client';

import React, { useState, useEffect } from 'react';
import { Auction } from '@/lib/types/auction';
import { formatCurrency } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  Calculator,
  TrendingUp,
  Percent,
  Calendar,
  Wrench,
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
  const { t, language } = useLanguage();

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
    holdingMonths > 0 ? netROI * (12 / holdingMonths) : netROI;

  const isProfitable = netProfit > 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
      {/* Title & Introduction */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {t.dossier.investmentYieldCalculator}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {t.dossier.investmentYieldDesc}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
          <span>Moneda:</span>
          <strong className="text-emerald-400 font-bold">{auction.currency}</strong>
        </div>
      </div>

      {/* Main Grid: Inputs (Left 50%) vs Projected Returns (Right 50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Investor Inputs & Statutory Closing Costs */}
        <div className="lg:col-span-6 space-y-5">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language === 'es' ? 'Variables de Inversión' : 'Investment Variables'}</span>
            </h3>

            {/* Target Bid Input */}
            <div className="space-y-1.5 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-slate-200">
                  {t.dossier.targetBid} ({auction.currency}):
                </label>
                <span className="text-[11px] text-slate-400">
                  {language === 'es' ? `Base remate: ${formatCurrency(defaultBasePrice, auction.currency)}` : `Call base: ${formatCurrency(defaultBasePrice, auction.currency)}`}
                </span>
              </div>
              <Input
                type="number"
                value={targetBid || ''}
                onChange={(e) => setTargetBid(Number(e.target.value))}
                className="font-mono text-base font-extrabold text-emerald-400 bg-slate-900 h-11"
              />
            </div>

            {/* Expected Resale Market Value */}
            <div className="space-y-1.5 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-slate-200">
                  {t.dossier.resaleMarketValue} ({auction.currency}):
                </label>
              </div>
              <Input
                type="number"
                value={resaleValue || ''}
                onChange={(e) => setResaleValue(Number(e.target.value))}
                className="font-mono text-base font-extrabold text-white bg-slate-900 h-11"
              />
            </div>

            {/* Renovation Budget & Holding Period Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <Wrench className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t.dossier.renovationBudget}</span>
                </label>
                <Input
                  type="number"
                  value={renovationBudget || ''}
                  onChange={(e) => setRenovationBudget(Number(e.target.value))}
                  className="font-mono text-xs font-bold text-slate-200 bg-slate-900 h-10"
                />
              </div>

              <div className="space-y-1.5 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t.dossier.holdingMonths}</span>
                </label>
                <Input
                  type="number"
                  value={holdingMonths || ''}
                  onChange={(e) => setHoldingMonths(Number(e.target.value))}
                  className="font-mono text-xs font-bold text-slate-200 bg-slate-900 h-10"
                />
              </div>
            </div>

            {/* Municipal & HOA Contingency */}
            <div className="space-y-1.5 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
              <label className="text-xs font-bold text-slate-300">
                {t.dossier.municipalHOABuffer} ({auction.currency}):
              </label>
              <Input
                type="number"
                value={municipalHOABuffer || ''}
                onChange={(e) => setMunicipalHOABuffer(Number(e.target.value))}
                className="font-mono text-xs font-bold text-slate-200 bg-slate-900 h-10"
              />
            </div>
          </div>

          {/* Statutory Notary Closing Breakdown Table */}
          <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.dossier.statutoryClosingCosts}</span>
            </h4>
            <div className="divide-y divide-slate-800/80 text-xs space-y-1.5 pt-1">
              <div className="flex justify-between items-center pt-1.5 text-slate-400">
                <span>{t.dossier.transferTax}:</span>
                <span className="font-mono font-bold text-slate-200">
                  {formatCurrency(transferTax, auction.currency)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1.5 text-slate-400">
                <span>{t.dossier.registryStamps}:</span>
                <span className="font-mono font-bold text-slate-200">
                  {formatCurrency(registryStamps, auction.currency)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1.5 text-slate-400">
                <span>{t.dossier.notaryFees}:</span>
                <span className="font-mono font-bold text-slate-200">
                  {formatCurrency(legalNotaryFees, auction.currency)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 font-bold text-emerald-400">
                <span>Total Gastos de Traspaso Notarial:</span>
                <span className="font-mono">
                  {formatCurrency(totalClosingFees, auction.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Output KPI Dashboard */}
        <div className="lg:col-span-6 space-y-5">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {language === 'es' ? 'Rendimiento y Desembolso Proyectado' : 'Projected Yield & Capital Required'}
            </h3>

            {/* Net Profit & ROI Hero Card */}
            <div
              className={`p-6 rounded-2xl border transition-all ${
                isProfitable
                  ? 'bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 border-emerald-500/50 shadow-xl shadow-emerald-950/40'
                  : 'bg-rose-950/60 border-rose-800/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  {t.dossier.projectedNetProfit}
                </span>
                <span className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                </span>
              </div>

              <p
                className={`text-3xl sm:text-4xl font-black font-mono tracking-tight mt-2 ${
                  isProfitable ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatCurrency(netProfit, auction.currency)}
              </p>

              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-800/80">
                <div>
                  <span className="text-[10.5px] uppercase font-bold text-slate-400 block">
                    {t.dossier.netROI}
                  </span>
                  <span
                    className={`text-xl font-black font-mono ${
                      isProfitable ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    {netROI.toFixed(1)}%
                  </span>
                </div>

                <div>
                  <span className="text-[10.5px] uppercase font-bold text-slate-400 block">
                    {t.dossier.annualizedIRR}
                  </span>
                  <span
                    className={`text-xl font-black font-mono ${
                      isProfitable ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    {annualizedROI.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Total Capital Breakdown */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {language === 'es' ? 'Estructura de Desembolso de Capital' : 'Capital Disbursement Breakdown'}
              </h4>

              <div className="space-y-2 text-xs">
                {/* 50% Day of auction deposit */}
                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>{language === 'es' ? '1. Depósito de Remate (Postura 50%):' : '1. Judicial Deposit (50%):'}</span>
                  </span>
                  <span className="font-mono font-bold text-amber-400">
                    {formatCurrency(courtDeposit50Pct, auction.currency)}
                  </span>
                </div>

                {/* Remaining 50% Balance */}
                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>{language === 'es' ? '2. Saldo de Adjudicación (50% en 3 días):' : '2. Balance Due (50% in 3 days):'}</span>
                  </span>
                  <span className="font-mono font-bold text-slate-200">
                    {formatCurrency(courtDeposit50Pct, auction.currency)}
                  </span>
                </div>

                {/* Notary, taxes & improvements */}
                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    <span>{language === 'es' ? '3. Traspaso + Mejoras + Provisión:' : '3. Closing Taxes + Renovation + Buffer:'}</span>
                  </span>
                  <span className="font-mono font-bold text-slate-200">
                    {formatCurrency(
                      totalClosingFees + renovationBudget + municipalHOABuffer,
                      auction.currency
                    )}
                  </span>
                </div>

                {/* Total All-in */}
                <div className="flex justify-between items-center p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 mt-3">
                  <span className="text-xs font-bold text-emerald-300 uppercase">
                    {t.dossier.totalAcquisitionCost}:
                  </span>
                  <span className="text-base font-black font-mono text-emerald-400">
                    {formatCurrency(totalAcquisitionCost, auction.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
