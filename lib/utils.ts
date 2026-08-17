import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Auction, Currency, InvestorMetrics, CostaRicaClosingCosts } from './types/auction';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency with proper symbols (CRC ₡ or USD $)
 */
export function formatCurrency(amount: number | null | undefined, currency: Currency = 'USD'): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'N/A';
  }

  if (currency === 'CRC') {
    return `₡${new Intl.NumberFormat('es-CR', {
      maximumFractionDigits: 0,
    }).format(amount)}`;
  }

  return `$${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(amount)}`;
}

/**
 * Format area in square meters and hectares if large
 */
export function formatArea(m2: number): string {
  if (m2 >= 10000) {
    const ha = (m2 / 10000).toFixed(2);
    return `${ha} ha (${new Intl.NumberFormat('es-CR').format(m2)} m²)`;
  }
  return `${new Intl.NumberFormat('es-CR').format(m2)} m²`;
}

/**
 * Calculate Costa Rican legal property transfer closing costs
 * Standard CR breakdown:
 * - 1.5% Real Estate Transfer Tax (Ley 7088)
 * - 0.8% - 1.0% Legal / Notary Bar Association Fees (Decreto de Aranceles)
 * - 0.5% National Registry & Fiscal Stamps (Timbres Fiscales, Agrario, Colegio Abogados)
 * Total estimated: ~2.8% of base price
 */
export function calculateClosingCosts(basePrice: number): CostaRicaClosingCosts {
  const transferTax = basePrice * 0.015;
  const notaryLegalFees = basePrice * 0.008;
  const registryStamps = basePrice * 0.005;
  const totalEstimatedClosingCosts = transferTax + notaryLegalFees + registryStamps;

  return {
    transferTax,
    notaryLegalFees,
    registryStamps,
    totalEstimatedClosingCosts,
  };
}

/**
 * Calculate Investor Metrics for a given call stage
 */
export function calculateInvestorMetrics(auction: Auction, callNumber: 1 | 2 | 3 = 1): InvestorMetrics {
  let currentBasePrice = auction.base_price_call_1;
  if (callNumber === 2 && auction.base_price_call_2) {
    currentBasePrice = auction.base_price_call_2;
  } else if (callNumber === 3 && auction.base_price_call_3) {
    currentBasePrice = auction.base_price_call_3;
  }

  const estimatedMarketValue = auction.estimated_market_value || currentBasePrice * 1.35;
  const grossMarginAmount = Math.max(0, estimatedMarketValue - currentBasePrice);
  const grossMarginPct = estimatedMarketValue > 0 
    ? (grossMarginAmount / estimatedMarketValue) * 100 
    : 0;

  const pricePerM2 = auction.area_m2 > 0 ? currentBasePrice / auction.area_m2 : 0;
  const marketPricePerM2 = auction.area_m2 > 0 ? estimatedMarketValue / auction.area_m2 : 0;

  const closingCosts = calculateClosingCosts(currentBasePrice);
  const totalAcquisitionCost = currentBasePrice + closingCosts.totalEstimatedClosingCosts;
  const netEstimatedProfit = Math.max(0, estimatedMarketValue - totalAcquisitionCost);
  const netROI = totalAcquisitionCost > 0 
    ? (netEstimatedProfit / totalAcquisitionCost) * 100 
    : 0;

  return {
    currentBasePrice,
    estimatedMarketValue,
    grossMarginAmount,
    grossMarginPct,
    pricePerM2,
    marketPricePerM2,
    closingCosts,
    totalAcquisitionCost,
    netEstimatedProfit,
    netROI,
  };
}

/**
 * Format Date in Spanish/Costa Rican format
 */
export function formatDateCR(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CR', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Get remaining days until auction
 */
export function getDaysUntilAuction(dateString: string): { days: number; isPast: boolean; label: string } {
  try {
    const target = new Date(dateString).getTime();
    const now = new Date().getTime();
    const diffMs = target - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { days: Math.abs(diffDays), isPast: true, label: `Finalizó hace ${Math.abs(diffDays)}d` };
    }
    if (diffDays === 0) {
      return { days: 0, isPast: false, label: '¡Hoy mismo!' };
    }
    if (diffDays === 1) {
      return { days: 1, isPast: false, label: 'Mañana' };
    }
    return { days: diffDays, isPast: false, label: `En ${diffDays} días` };
  } catch {
    return { days: 0, isPast: false, label: 'Fecha pendiente' };
  }
}

/**
 * Decode Costa Rica Folio Real to readable string
 * e.g. '6-189342-000' -> Province 6 (Puntarenas), Finca 189342, Sublot 000
 */
export function parseFolioReal(folio: string): { provinceCode: number; fincaNumber: string; sublot: string } {
  const parts = folio.split('-');
  return {
    provinceCode: parts[0] ? parseInt(parts[0], 10) : 0,
    fincaNumber: parts[1] || '',
    sublot: parts[2] || '000',
  };
}
