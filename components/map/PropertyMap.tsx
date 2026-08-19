'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Auction } from '@/lib/types/auction';
import { 
  formatCurrency, 
  formatArea, 
  getDaysUntilAuction, 
  detectPropertyCharacteristics,
  getLiveAuctionProgressionState,
  getCallStageConfig,
} from '@/lib/utils';
import Link from 'next/link';
import { ArrowRight, MapPin, Calendar, Maximize2, Scale, TrendingUp, Sparkles, AlertTriangle, Layers } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useTheme } from '@/lib/theme/ThemeContext';
import { PropertyTypeBadge } from '@/components/ui/PropertyTypeIcon';

export interface PropertyMapProps {
  auctions: Auction[];
  selectedAuctionId?: string | null;
  onSelectAuction?: (auction: Auction) => void;
  center?: [number, number];
  zoom?: number;
  height?: string;
  className?: string;
}

// Controller to smoothly pan & zoom map when selection or center changes
function MapController({
  center,
  zoom,
  selectedAuction,
}: {
  center?: [number, number];
  zoom?: number;
  selectedAuction?: Auction | null;
}) {
  const map = useMap();
  const prevSelectedId = React.useRef<string | null>(null);

  useEffect(() => {
    if (selectedAuction && selectedAuction.latitude && selectedAuction.longitude) {
      if (prevSelectedId.current !== selectedAuction.id) {
        prevSelectedId.current = selectedAuction.id;
        map.flyTo([selectedAuction.latitude, selectedAuction.longitude], Math.max(map.getZoom(), 12), {
          duration: 0.9,
          easeLinearity: 0.25,
        });
      }
    } else if (center) {
      prevSelectedId.current = null;
      map.flyTo(center, zoom || 7.5, { duration: 1.0 });
    }
  }, [center, zoom, selectedAuction, map]);

  return null;
}

export function PropertyMap({
  auctions,
  selectedAuctionId,
  onSelectAuction,
  center = [9.7489, -84.05], // Whole country Costa Rica center
  zoom = 7.5, // Zoomed out to view entire country
  height = '100%',
  className = '',
}: PropertyMapProps) {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Color-coded marker generator based on Call Stage:
  // - 1st Call = Green (Emerald)
  // - 2nd Call = Yellow (Yellow)
  // - 3rd Call = Orange (Orange)
  const createColorCodedIcon = (auction: Auction, isSelected: boolean) => {
    const liveState = getLiveAuctionProgressionState(auction);
    
    let colorClass = 'bg-emerald-600 border-emerald-300 text-white shadow-emerald-950/70';
    let ringClass = isSelected 
      ? isDark
        ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-slate-950 scale-125 z-50' 
        : 'ring-4 ring-emerald-500 ring-offset-2 ring-offset-white scale-125 z-50'
      : 'hover:scale-115';
    let badgeText = language === 'es' ? '1°' : '1st';

    if (liveState.saleStatus === 'in_progress' || liveState.isHearing) {
      colorClass = 'bg-rose-600 border-rose-300 text-white shadow-rose-950/70 animate-pulse';
      ringClass = isSelected 
        ? isDark
          ? 'ring-4 ring-rose-400 ring-offset-2 ring-offset-slate-950 scale-125 z-50' 
          : 'ring-4 ring-rose-500 ring-offset-2 ring-offset-white scale-125 z-50'
        : 'hover:scale-115';
      badgeText = '🔴';
    } else if (liveState.callStage === 'call_3' || liveState.currentCallNumber === 3) {
      colorClass = 'bg-orange-500 border-orange-200 text-white shadow-orange-950/70';
      ringClass = isSelected 
        ? isDark
          ? 'ring-4 ring-orange-400 ring-offset-2 ring-offset-slate-950 scale-125 z-50' 
          : 'ring-4 ring-orange-500 ring-offset-2 ring-offset-white scale-125 z-50'
        : 'hover:scale-115';
      badgeText = language === 'es' ? '3°' : '3rd';
    } else if (liveState.callStage === 'call_2' || liveState.currentCallNumber === 2) {
      colorClass = 'bg-yellow-500 border-yellow-200 text-slate-950 shadow-yellow-950/70';
      ringClass = isSelected 
        ? isDark
          ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-950 scale-125 z-50' 
          : 'ring-4 ring-yellow-500 ring-offset-2 ring-offset-white scale-125 z-50'
        : 'hover:scale-115';
      badgeText = language === 'es' ? '2°' : '2nd';
    } else {
      colorClass = 'bg-emerald-600 border-emerald-300 text-white shadow-emerald-950/70';
      ringClass = isSelected 
        ? isDark
          ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-slate-950 scale-125 z-50' 
          : 'ring-4 ring-emerald-500 ring-offset-2 ring-offset-white scale-125 z-50'
        : 'hover:scale-115';
      badgeText = language === 'es' ? '1°' : '1st';
    }

    const iconHtml = `
      <div class="relative flex items-center justify-center cursor-pointer transition-all duration-300 ${ringClass}">
        <div class="flex items-center justify-center w-10 h-10 rounded-full border-2 shadow-xl ${colorClass} text-[11px] font-black tracking-tight">
          ${badgeText}
        </div>
        <div class="absolute -bottom-1 w-2 h-2 rotate-45 ${colorClass.split(' ')[0]}"></div>
      </div>
    `;

    return L.divIcon({
      className: 'custom-leaflet-marker-pin',
      html: iconHtml,
      iconSize: [40, 44],
      iconAnchor: [20, 42],
      popupAnchor: [0, -42],
    });
  };

  const validAuctions = auctions.filter(
    (a) => a.latitude !== null && a.longitude !== null && !isNaN(a.latitude) && !isNaN(a.longitude)
  );

  const selectedAuction = validAuctions.find((a) => a.id === selectedAuctionId) || null;

  // Choose tile layer based on light/dark mode
  const tileLayerUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  const tileLayerAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  return (
    <div style={{ height }} className={`w-full h-full relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 shadow-inner ${className}`}>
      {/* Persistent Map Centroid Disclaimer Badge */}
      <div className="absolute top-3 left-14 sm:left-1/2 sm:-translate-x-1/2 z-[400] max-w-xs sm:max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-amber-500/40 rounded-xl px-3 py-2 text-[11px] text-amber-900 dark:text-amber-200/95 shadow-xl flex items-start gap-2 pointer-events-auto">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-tight">
          {language === 'en'
            ? '📍 Approximate location by district centroid. Edicts do not contain GPS coordinates. Verify registered survey (Plano Catastrado).'
            : '📍 Ubicación aproximada por centroide de distrito/cantón. Los remates judiciales no incluyen GPS exacto en el edicto. Verifique el plano catastrado.'}
        </p>
      </div>

      {/* Interactive Legend Overlay (Top-Right): 1st Call = Green, 2nd Call = Yellow, 3rd Call = Orange */}
      <div className="absolute top-3 right-3 z-[400] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-xl px-3 py-2 text-[11px] text-slate-700 dark:text-slate-300 shadow-xl space-y-1.5 pointer-events-auto hidden md:block">
        <p className="font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{language === 'es' ? 'Señalamiento de Remate' : 'Auction Call Stage'}</span>
        </p>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block ring-2 ring-emerald-500/20" />
          <span>{language === 'es' ? '1° Remate (Verde)' : '1st Call (Green)'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block ring-2 ring-yellow-500/20" />
          <span>{language === 'es' ? '2° Remate (Amarillo)' : '2nd Call (Yellow)'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block ring-2 ring-orange-500/20" />
          <span>{language === 'es' ? '3° Remate (Naranja)' : '3rd Call (Orange)'}</span>
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <MapController center={center} zoom={zoom} selectedAuction={selectedAuction} />
        
        {/* Dynamic Light/Dark Tile Layer */}
        <TileLayer
          key={theme} // Key forces reload when switching theme
          attribution={tileLayerAttribution}
          url={tileLayerUrl}
          maxZoom={19}
        />

        {validAuctions.map((auction) => {
          const isSelected = selectedAuctionId === auction.id;
          const liveState = getLiveAuctionProgressionState(auction);
          const stageConfig = getCallStageConfig(liveState);
          const activeDate = liveState.currentAuctionDate || auction.auction_date_call_1;
          const countdown = getDaysUntilAuction(activeDate, language);
          const { propertyType } = detectPropertyCharacteristics(auction);

          return (
            <Marker
              key={auction.id}
              position={[auction.latitude!, auction.longitude!]}
              icon={createColorCodedIcon(auction, isSelected)}
              eventHandlers={{
                click: () => {
                  if (onSelectAuction) onSelectAuction(auction);
                },
              }}
            >
              <Popup className="custom-auction-popup">
                <div className="w-72 space-y-2.5 p-1">
                  {/* Category Pill & Disclaimer Header */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-extrabold border ${stageConfig.tagClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${stageConfig.dotClass}`} />
                          <span>{language === 'es' ? stageConfig.shortLabelEs : stageConfig.shortLabelEn}</span>
                        </span>
                        <PropertyTypeBadge type={propertyType} language={language} size="sm" />
                      </div>
                      {auction.estimated_margin_pct && (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 text-[10.5px] font-extrabold">
                          +{Math.round(auction.estimated_margin_pct)}%
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <span>📍</span>
                      <span>
                        {language === 'en'
                          ? 'Estimated District Centroid • Verify Plano Catastrado'
                          : 'Centroide Distrital Estimado • Consulte el Plano Catastrado'}
                      </span>
                    </p>
                  </div>

                  {/* Title & Expediente */}
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                      {auction.district ? `${auction.district}, ` : ''}{auction.canton} • Folio {auction.folio_real}
                    </p>
                    <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                      <Scale className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500 shrink-0" />
                      {auction.expediente_number}
                    </p>
                  </div>

                  {/* Price breakdown */}
                  <div className="bg-slate-100 dark:bg-slate-950/80 p-2 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                        {language === 'es' ? stageConfig.shortLabelEs : stageConfig.shortLabelEn}:
                      </span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatCurrency(liveState.currentBasePrice, auction.currency)}
                      </span>
                    </div>
                    {auction.estimated_market_value && (
                      <div className="flex justify-between items-baseline text-[11px]">
                        <span className="text-slate-500">{language === 'es' ? 'Valor Estimado:' : 'Est. Market Value:'}</span>
                        <span className="text-slate-400 line-through">
                          {formatCurrency(auction.estimated_market_value, auction.currency)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Area & Countdown */}
                  <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 pt-0.5">
                    <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                      <Maximize2 className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      {formatArea(auction.area_m2)}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                      <Calendar className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      {countdown.label}
                    </span>
                  </div>

                  {/* Link to Dossier */}
                  <Link
                    href={`/auctions/${auction.id}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 rounded-lg transition-colors shadow-md"
                  >
                    <span>{language === 'es' ? 'Ver Expediente y Avalúo' : 'View Legal Dossier'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
