'use client';

import React from 'react';
import { Auction } from '@/lib/types/auction';
import { calculateOpportunityAlpha, calculateTitleSecurityRating } from '@/lib/utils';
import { ShieldCheck, ShieldAlert, AlertTriangle, Zap, Sparkles, Award } from 'lucide-react';

interface DealAlphaBadgeProps {
  auction: Auction;
  language?: 'es' | 'en';
  size?: 'sm' | 'md' | 'lg';
  showTitleTier?: boolean;
  className?: string;
}

export function DealAlphaBadge({
  auction,
  language = 'es',
  size = 'md',
  showTitleTier = true,
  className = '',
}: DealAlphaBadgeProps) {
  const alpha = calculateOpportunityAlpha(auction, language);
  const security = calculateTitleSecurityRating(auction, language);

  // Grade colors & styles
  const gradeStyles = {
    AAA: {
      badge: 'bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 border-emerald-400/60 text-emerald-300 shadow-emerald-950/40',
      gradeText: 'text-emerald-300 font-black',
      icon: Sparkles,
      iconColor: 'text-emerald-300',
    },
    AA: {
      badge: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-emerald-950/30',
      gradeText: 'text-emerald-400 font-black',
      icon: Award,
      iconColor: 'text-emerald-400',
    },
    A: {
      badge: 'bg-sky-950/80 border-sky-500/50 text-sky-300 shadow-sky-950/30',
      gradeText: 'text-sky-400 font-black',
      icon: Zap,
      iconColor: 'text-sky-400',
    },
    B: {
      badge: 'bg-amber-950/70 border-amber-500/40 text-amber-300 shadow-amber-950/20',
      gradeText: 'text-amber-400 font-extrabold',
      icon: Zap,
      iconColor: 'text-amber-400',
    },
    C: {
      badge: 'bg-slate-900 border-slate-700 text-slate-300 shadow-slate-950/20',
      gradeText: 'text-slate-400 font-bold',
      icon: Zap,
      iconColor: 'text-slate-400',
    },
  }[alpha.grade];

  // Tier colors & styles
  const tierStyles = {
    tier_1: {
      badge: 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300',
      icon: ShieldCheck,
      iconColor: 'text-emerald-400',
    },
    tier_2: {
      badge: 'bg-amber-950/80 border-amber-500/40 text-amber-300',
      icon: ShieldAlert,
      iconColor: 'text-amber-400',
    },
    tier_3: {
      badge: 'bg-rose-950/80 border-rose-500/40 text-rose-300',
      icon: AlertTriangle,
      iconColor: 'text-rose-400',
    },
  }[security.tier];

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-[11px] px-2.5 py-1 gap-1.5',
    lg: 'text-xs px-3.5 py-1.5 gap-2',
  }[size];

  const IconComponent = gradeStyles.icon;
  const TierIconComponent = tierStyles.icon;

  return (
    <div className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {/* Opportunity Alpha Score Pill */}
      <span
        title={`Alpha Opportunity Rating: ${alpha.score}/100 · ${alpha.label}`}
        className={`inline-flex items-center rounded-lg border backdrop-blur-md shadow-md font-sans tracking-wide transition-all ${sizeClasses} ${gradeStyles.badge}`}
      >
        <IconComponent className={`shrink-0 ${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} ${gradeStyles.iconColor}`} />
        <span className={gradeStyles.gradeText}>Alpha {alpha.grade}</span>
        <span className="opacity-40">|</span>
        <span className="font-mono font-bold">{alpha.score}</span>
      </span>

      {/* Title Security Tier Pill */}
      {showTitleTier && (
        <span
          title={`Legal Security: ${security.label} · ${security.legalCitation}`}
          className={`inline-flex items-center rounded-lg border backdrop-blur-md shadow-md font-sans tracking-wide transition-all ${sizeClasses} ${tierStyles.badge}`}
        >
          <TierIconComponent className={`shrink-0 ${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} ${tierStyles.iconColor}`} />
          <span className="font-bold">
            {security.tier === 'tier_1' 
              ? (language === 'en' ? 'Tier 1 · Senior Lien' : 'Tier 1 · 1° Grado')
              : security.tier === 'tier_2'
              ? (language === 'en' ? 'Tier 2 · Subordinate' : 'Tier 2 · 2° Grado')
              : (language === 'en' ? 'Tier 3 · Embargo' : 'Tier 3 · Embargo')}
          </span>
        </span>
      )}
    </div>
  );
}
