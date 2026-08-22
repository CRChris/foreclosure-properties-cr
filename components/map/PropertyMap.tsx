'use client';

import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, GeoJSON, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Auction, SubPropertyParcel } from '@/lib/types/auction';
import { 
  getLiveAuctionProgressionState,
} from '@/lib/utils';
import Link from 'next/link';
import { 
  AlertTriangle, 
  Layers,
  Globe,
  Satellite,
  Target,
  Loader2,
  Compass,
  Package,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useTheme } from '@/lib/theme/ThemeContext';
import { COSTA_RICA_BOUNDS, COSTA_RICA_CENTER, COSTA_RICA_DEFAULT_ZOOM } from './mapConstants';

export { COSTA_RICA_BOUNDS, COSTA_RICA_CENTER, COSTA_RICA_DEFAULT_ZOOM };

export interface PropertyMapProps {
  auctions: Auction[];
  selectedAuctionId?: string | null;
  onSelectAuction?: (auction: Auction | null) => void;
  selectedSubParcelIndex?: number | null;
  onSelectSubProperty?: (auction: Auction, subProperty: SubPropertyParcel) => void;
  center?: [number, number];
  zoom?: number;
  height?: string;
  className?: string;
  autoFocusPolygon?: boolean;
  minimizedPinId?: string | null;
  onToggleMinimizePin?: (minimized: boolean) => void;
}

// Controller to smoothly pan & zoom map to parcel polygon bounds or point coordinates
function MapController({
  center = COSTA_RICA_CENTER,
  zoom = COSTA_RICA_DEFAULT_ZOOM,
  selectedAuction,
  selectedSubParcelIndex,
  resetTrigger,
}: {
  center?: [number, number];
  zoom?: number;
  selectedAuction?: Auction | null;
  selectedSubParcelIndex?: number | null;
  resetTrigger?: number;
}) {
  const map = useMap();
  const prevSelectionKey = React.useRef<string | null>(null);
  const prevResetTrigger = React.useRef<number>(0);

  useEffect(() => {
    // 1. Reset button triggered ("Full CR")
    if (resetTrigger && resetTrigger !== prevResetTrigger.current) {
      prevResetTrigger.current = resetTrigger;
      prevSelectionKey.current = null;
      map.flyToBounds(COSTA_RICA_BOUNDS, {
        padding: [24, 24],
        duration: 0.9,
      });
      return;
    }

    const currentKey = selectedAuction
      ? `${selectedAuction.id}_sub_${selectedSubParcelIndex ?? 'all'}`
      : null;

    if (selectedAuction) {
      if (prevSelectionKey.current !== currentKey) {
        prevSelectionKey.current = currentKey;

        // A. If a specific sub-property is selected in a portfolio auction:
        if (
          selectedAuction.is_portfolio_auction &&
          selectedAuction.sub_properties &&
          selectedSubParcelIndex !== null &&
          selectedSubParcelIndex !== undefined
        ) {
          const subProp = selectedAuction.sub_properties.find(
            (sp) => sp.parcel_index === selectedSubParcelIndex
          );
          if (subProp && subProp.latitude && subProp.longitude) {
            // Zoom directly into the exact parcel polygon if available
            if (subProp.parcel_polygon) {
              try {
                const geoJsonLayer = L.geoJSON(subProp.parcel_polygon as any);
                const bounds = geoJsonLayer.getBounds();
                if (bounds.isValid()) {
                  map.fitBounds(bounds, {
                    padding: [45, 45],
                    maxZoom: 18,
                    animate: true,
                    duration: 0.9,
                  });
                  return;
                }
              } catch (e) {
                console.warn('Could not compute sub-property polygon bounds:', e);
              }
            }

            // High-resolution property level point zoom (zoom 18 shows full parcel borders)
            map.flyTo([subProp.latitude, subProp.longitude], 18, {
              duration: 0.9,
              easeLinearity: 0.25,
            });
            return;
          }
        }

        // B. If portfolio auction is selected without a specific sub-parcel, zoom directly to first parcel or frame
        if (
          selectedAuction.is_portfolio_auction &&
          selectedAuction.sub_properties &&
          selectedAuction.sub_properties.length > 0
        ) {
          const firstProp = selectedAuction.sub_properties[0];
          if (firstProp && firstProp.latitude && firstProp.longitude) {
            if (firstProp.parcel_polygon) {
              try {
                const geoJsonLayer = L.geoJSON(firstProp.parcel_polygon as any);
                const bounds = geoJsonLayer.getBounds();
                if (bounds.isValid()) {
                  map.fitBounds(bounds, {
                    padding: [45, 45],
                    maxZoom: 18,
                    animate: true,
                    duration: 0.9,
                  });
                  return;
                }
              } catch {
                // ignore
              }
            }
            map.flyTo([firstProp.latitude, firstProp.longitude], 18, {
              duration: 0.9,
              easeLinearity: 0.25,
            });
            return;
          }
        }

        // C. Standard single property auction: zoom in directly to property level (zoom 18)
        if (selectedAuction.latitude && selectedAuction.longitude) {
          if (selectedAuction.parcel_polygon) {
            try {
              const geoJsonLayer = L.geoJSON(selectedAuction.parcel_polygon as any);
              const bounds = geoJsonLayer.getBounds();
              if (bounds.isValid()) {
                map.fitBounds(bounds, {
                  padding: [45, 45],
                  maxZoom: 18,
                  animate: true,
                  duration: 0.9,
                });
                return;
              }
            } catch (e) {
              console.warn('Could not compute polygon bounds:', e);
            }
          }

          // Full property-level zoom
          map.flyTo([selectedAuction.latitude, selectedAuction.longitude], 18, {
            duration: 0.9,
            easeLinearity: 0.25,
          });
        }
      }
    } else if (!selectedAuction && prevSelectionKey.current !== null) {
      prevSelectionKey.current = null;
      map.flyToBounds(COSTA_RICA_BOUNDS, {
        padding: [24, 24],
        duration: 0.9,
      });
    }
  }, [center, zoom, selectedAuction, selectedSubParcelIndex, resetTrigger, map]);

  return null;
}

export function PropertyMap({
  auctions,
  selectedAuctionId,
  onSelectAuction,
  selectedSubParcelIndex,
  onSelectSubProperty,
  center = COSTA_RICA_CENTER, // Whole country Costa Rica center
  zoom = COSTA_RICA_DEFAULT_ZOOM, // Zoomed out to view entire country
  height = '100%',
  className = '',
  minimizedPinId: controlledMinimizedPinId,
  onToggleMinimizePin,
}: PropertyMapProps) {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapLayer, setMapLayer] = useState<'streets' | 'satellite'>('streets');
  const [resetTrigger, setResetTrigger] = useState(0);
  const [internalMinimizedPinId, setInternalMinimizedPinId] = useState<string | null>(null);

  const activeMinimizedPinId = controlledMinimizedPinId !== undefined 
    ? controlledMinimizedPinId 
    : internalMinimizedPinId;

  const setMinimizedPinId = (val: string | null) => {
    setInternalMinimizedPinId(val);
    if (onToggleMinimizePin) {
      onToggleMinimizePin(val !== null);
    }
  };

  // Only reset internalMinimizedPinId when selectedAuctionId ACTUALLY changes to a different auction ID
  const prevSelectedAuctionIdRef = useRef<string | null>(selectedAuctionId ?? null);
  useEffect(() => {
    const currentId = selectedAuctionId ?? null;
    if (prevSelectedAuctionIdRef.current !== currentId) {
      prevSelectedAuctionIdRef.current = currentId;
      setInternalMinimizedPinId(null);
    }
  }, [selectedAuctionId]);

  // Capture phase listener to handle the 'x' close button click on the marker
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleCaptureClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const closeBtn = target.closest<HTMLElement>('.pin-close-btn');
      if (closeBtn) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const pinKey = closeBtn.getAttribute('data-pin-key') || closeBtn.getAttribute('data-auction-id');
        if (pinKey) {
          setMinimizedPinId(activeMinimizedPinId === pinKey ? null : pinKey);
        }
      }
    };

    container.addEventListener('click', handleCaptureClick, true);
    return () => {
      container.removeEventListener('click', handleCaptureClick, true);
    };
  }, [activeMinimizedPinId]);

  // Helper to compute side position for minimized pin (outside property polygon / parcel boundary)
  const getMinimizedPosition = (auction: Auction): [number, number] => {
    if (auction.parcel_polygon) {
      try {
        const geoJsonLayer = L.geoJSON(auction.parcel_polygon as any);
        const bounds = geoJsonLayer.getBounds();
        if (bounds.isValid()) {
          const northEast = bounds.getNorthEast();
          const southWest = bounds.getSouthWest();
          const polyCenter = bounds.getCenter();
          const lngSpan = Math.abs(northEast.lng - southWest.lng);
          const latSpan = Math.abs(northEast.lat - southWest.lat);

          // Shift to the East / North-East of the polygon boundary so boundary is 100% visible
          const offsetLng = Math.max(lngSpan * 0.45, 0.0004);
          const offsetLat = Math.max(latSpan * 0.25, 0.0002);

          return [polyCenter.lat + offsetLat, northEast.lng + offsetLng];
        }
      } catch (e) {
        console.warn('Could not compute polygon bounds for minimized pin:', e);
      }
    }

    // Default point offset if no polygon
    return [auction.latitude! + 0.0002, auction.longitude! + 0.00045];
  };

  // Helper to compute side position for minimized sub-property pin
  const getSubPropertyMinimizedPosition = (subProperty: SubPropertyParcel): [number, number] => {
    if (subProperty.parcel_polygon) {
      try {
        const geoJsonLayer = L.geoJSON(subProperty.parcel_polygon as any);
        const bounds = geoJsonLayer.getBounds();
        if (bounds.isValid()) {
          const northEast = bounds.getNorthEast();
          const southWest = bounds.getSouthWest();
          const polyCenter = bounds.getCenter();
          const lngSpan = Math.abs(northEast.lng - southWest.lng);
          const latSpan = Math.abs(northEast.lat - southWest.lat);

          // Shift to the East / North-East of the polygon boundary so boundary is 100% visible
          const offsetLng = Math.max(lngSpan * 0.5, 0.00035);
          const offsetLat = Math.max(latSpan * 0.3, 0.0002);

          return [polyCenter.lat + offsetLat, northEast.lng + offsetLng];
        }
      } catch (e) {
        console.warn('Could not compute polygon bounds for sub-property minimized pin:', e);
      }
    }

    // Default point offset if no polygon
    return [(subProperty.latitude || 0) + 0.0002, (subProperty.longitude || 0) + 0.00045];
  };

  const getLeaderColor = (auction: Auction) => {
    const liveState = getLiveAuctionProgressionState(auction);
    if (liveState.saleStatus === 'in_progress' || liveState.isHearing) return '#f43f5e';
    if (liveState.callStage === 'call_3' || liveState.currentCallNumber === 3) return '#f97316';
    if (liveState.callStage === 'call_2' || liveState.currentCallNumber === 2) return '#eab308';
    return '#10b981';
  };

  // Check if an auction is co-located with or inside the parcel boundary of the selected auction (or any of its sub-properties)
  const isAuctionCoLocatedWithSelected = (
    auction: Auction,
    selected: Auction | null
  ): boolean => {
    if (!selected) return false;
    if (auction.id === selected.id) return true;
    
    // Check coordinate proximity (< 30 meters)
    if (selected.latitude && selected.longitude && auction.latitude && auction.longitude) {
      const latDiff = Math.abs(auction.latitude - selected.latitude);
      const lngDiff = Math.abs(auction.longitude - selected.longitude);
      if (latDiff < 0.0003 && lngDiff < 0.0003) {
        return true;
      }
    }

    // If selected is a portfolio auction, check proximity against all sub-properties
    if (selected.is_portfolio_auction && selected.sub_properties && auction.latitude && auction.longitude) {
      for (const sp of selected.sub_properties) {
        if (sp.latitude && sp.longitude) {
          const spLatDiff = Math.abs(auction.latitude - sp.latitude);
          const spLngDiff = Math.abs(auction.longitude - sp.longitude);
          if (spLatDiff < 0.0003 && spLngDiff < 0.0003) {
            return true;
          }
        }
      }
    }

    // Check if coordinate is within the selected property's parcel polygon bounds
    if (selected.parcel_polygon && auction.latitude && auction.longitude) {
      try {
        const bounds = L.geoJSON(selected.parcel_polygon as any).getBounds();
        if (bounds.isValid() && bounds.contains([auction.latitude, auction.longitude])) {
          return true;
        }
      } catch {
        // ignore
      }
    }

    return false;
  };

  // Color-coded marker generator based on Call Stage & Cadastral Exactness:
  const createColorCodedIcon = (auction: Auction, isSelected: boolean) => {
    const liveState = getLiveAuctionProgressionState(auction);
    const isExact = auction.location_type === 'exact_cadastral';
    
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

    const exactBadgeDot = isExact 
      ? `<span class="absolute -top-1.5 -left-1.5 flex h-3.5 w-3.5"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 text-[8px] items-center justify-center font-black text-white">✓</span></span>`
      : '';

    const closeButtonHtml = isSelected
      ? `<button type="button" class="pin-close-btn absolute -top-3 -right-3 w-5 h-5 bg-slate-900/95 hover:bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-xl border-2 border-white dark:border-slate-800 transition-transform duration-200 hover:scale-125 active:scale-90 cursor-pointer z-30 pointer-events-auto" data-auction-id="${auction.id}" title="${language === 'es' ? 'Cerrar marcador para ver linderos' : 'Close pin to view property borders'}">✕</button>`
      : '';

    const iconHtml = `
      <div class="relative flex items-center justify-center cursor-pointer transition-all duration-300 ${ringClass}">
        ${closeButtonHtml}
        <div class="flex items-center justify-center w-10 h-10 rounded-full border-2 shadow-xl ${colorClass} text-[11px] font-black tracking-tight">
          ${badgeText}
        </div>
        ${exactBadgeDot}
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

  // Minimized compact circular marker positioned to the side of the property
  const createMinimizedIcon = (auction: Auction) => {
    const liveState = getLiveAuctionProgressionState(auction);
    let colorClass = 'bg-emerald-600 border-emerald-300 text-white shadow-emerald-950/70';
    let badgeText = language === 'es' ? '1°' : '1st';
    let glowColor = 'rgba(16, 185, 129, 0.7)';

    if (liveState.saleStatus === 'in_progress' || liveState.isHearing) {
      colorClass = 'bg-rose-600 border-rose-300 text-white shadow-rose-950/70 animate-pulse';
      badgeText = '🔴';
      glowColor = 'rgba(244, 63, 94, 0.7)';
    } else if (liveState.callStage === 'call_3' || liveState.currentCallNumber === 3) {
      colorClass = 'bg-orange-500 border-orange-200 text-white shadow-orange-950/70';
      badgeText = language === 'es' ? '3°' : '3rd';
      glowColor = 'rgba(249, 115, 22, 0.7)';
    } else if (liveState.callStage === 'call_2' || liveState.currentCallNumber === 2) {
      colorClass = 'bg-yellow-500 border-yellow-200 text-slate-950 shadow-yellow-950/70';
      badgeText = language === 'es' ? '2°' : '2nd';
      glowColor = 'rgba(234, 179, 8, 0.7)';
    }

    const iconHtml = `
      <div class="relative flex items-center justify-center group cursor-pointer" title="${language === 'es' ? 'Clic para abrir marcador sobre la propiedad' : 'Click to open pin over property'}">
        <span class="animate-ping absolute inline-flex h-7 w-7 rounded-full opacity-60" style="background-color: ${glowColor};"></span>
        <div class="relative flex items-center justify-center w-7 h-7 rounded-full border-2 shadow-2xl ${colorClass} text-[9.5px] font-black tracking-tight ring-2 ring-white dark:ring-slate-900 transition-transform duration-200 group-hover:scale-125">
          ${badgeText}
          <span class="absolute -top-1 -right-1 w-3 h-3 bg-slate-900 text-white rounded-full flex items-center justify-center text-[7px] font-black border border-white/80 shadow">⤢</span>
        </div>
      </div>
    `;

    return L.divIcon({
      className: 'custom-leaflet-minimized-pin',
      html: iconHtml,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
    });
  };

  // Minimized compact circular marker for sub-properties positioned to the side of the parcel
  const createSubPropertyMinimizedIcon = (auction: Auction, subProperty: SubPropertyParcel) => {
    const liveState = getLiveAuctionProgressionState(auction);
    let colorClass = 'bg-emerald-700 border-emerald-300 text-white shadow-emerald-950/70';
    let glowColor = 'rgba(16, 185, 129, 0.7)';

    if (liveState.callStage === 'call_3') {
      colorClass = 'bg-orange-600 border-orange-200 text-white shadow-orange-950/70';
      glowColor = 'rgba(249, 115, 22, 0.7)';
    } else if (liveState.callStage === 'call_2') {
      colorClass = 'bg-amber-600 border-amber-200 text-white shadow-amber-950/70';
      glowColor = 'rgba(245, 158, 11, 0.7)';
    }

    const iconHtml = `
      <div class="relative flex items-center justify-center group cursor-pointer" title="${language === 'es' ? `Clic para restaurar marcador #${subProperty.parcel_index} (${subProperty.canton})` : `Click to restore pin #${subProperty.parcel_index} (${subProperty.canton})`}">
        <span class="animate-ping absolute inline-flex h-7 w-7 rounded-full opacity-60" style="background-color: ${glowColor};"></span>
        <div class="relative flex items-center justify-center w-7 h-7 rounded-full border-2 shadow-2xl ${colorClass} text-[8.5px] font-black tracking-tight ring-2 ring-white dark:ring-slate-900 transition-transform duration-200 group-hover:scale-125">
          #${subProperty.parcel_index}
          <span class="absolute -top-1 -right-1 w-3 h-3 bg-slate-900 text-white rounded-full flex items-center justify-center text-[7px] font-black border border-white/80 shadow">⤢</span>
        </div>
      </div>
    `;

    return L.divIcon({
      className: 'custom-leaflet-minimized-pin',
      html: iconHtml,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
    });
  };

  // Distinct Color-Coded Marker for Sub-Properties within a Portfolio Auction
  const createSubPropertyIcon = (
    auction: Auction,
    subProperty: SubPropertyParcel,
    isParentSelected: boolean,
    isSubParcelSelected: boolean
  ) => {
    const liveState = getLiveAuctionProgressionState(auction);
    const isExact = subProperty.location_type === 'exact_cadastral';
    const parcelIdx = subProperty.parcel_index;
    const pinKey = `${auction.id}_sub_${subProperty.parcel_index}`;

    let colorClass = 'bg-emerald-700 border-emerald-300 text-white shadow-emerald-950/70';
    let ringClass = isSubParcelSelected
      ? isDark
        ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-slate-950 scale-135 z-50 animate-pulse'
        : 'ring-4 ring-emerald-500 ring-offset-2 ring-offset-white scale-135 z-50 animate-pulse'
      : isParentSelected
      ? isDark
        ? 'ring-3 ring-emerald-400/80 ring-offset-1 ring-offset-slate-950 scale-120 z-40'
        : 'ring-3 ring-emerald-500/80 ring-offset-1 ring-offset-white scale-120 z-40'
      : 'hover:scale-115';

    if (liveState.callStage === 'call_3') {
      colorClass = 'bg-orange-600 border-orange-200 text-white shadow-orange-950/70';
    } else if (liveState.callStage === 'call_2') {
      colorClass = 'bg-amber-600 border-amber-200 text-white shadow-amber-950/70';
    }

    const exactBadgeDot = isExact
      ? `<span class="absolute -top-1.5 -left-1.5 flex h-3.5 w-3.5"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 text-[8px] items-center justify-center font-black text-white">✓</span></span>`
      : '';

    const closeButtonHtml = (isParentSelected || isSubParcelSelected)
      ? `<button type="button" class="pin-close-btn absolute -top-3 -right-3 w-5 h-5 bg-slate-900/95 hover:bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-xl border-2 border-white dark:border-slate-800 transition-transform duration-200 hover:scale-125 active:scale-90 cursor-pointer z-50 pointer-events-auto" data-pin-key="${pinKey}" data-auction-id="${auction.id}" onmousedown="event.stopPropagation();" onclick="event.stopPropagation(); event.preventDefault();" title="${language === 'es' ? 'Mover marcador a un lado para ver linderos' : 'Move pin aside to view property borders'}">✕</button>`
      : '';

    const iconHtml = `
      <div class="relative flex items-center justify-center cursor-pointer transition-all duration-300 ${ringClass}">
        ${closeButtonHtml}
        <div class="flex flex-col items-center justify-center w-11 h-11 rounded-full border-2 shadow-xl ${colorClass} text-[10px] font-black tracking-tight leading-tight">
          <span class="text-[7.5px] opacity-85 leading-none">📦 #${parcelIdx}</span>
          <span class="text-[9px] leading-none">${subProperty.canton.slice(0, 5)}</span>
        </div>
        ${exactBadgeDot}
        <div class="absolute -bottom-1 w-2 h-2 rotate-45 ${colorClass.split(' ')[0]}"></div>
      </div>
    `;

    return L.divIcon({
      className: 'custom-leaflet-marker-pin',
      html: iconHtml,
      iconSize: [44, 48],
      iconAnchor: [22, 46],
      popupAnchor: [0, -46],
    });
  };

  const validAuctions = React.useMemo(() => {
    const seenIds = new Set<string>();
    const seenExp = new Set<string>();
    const list: Auction[] = [];

    for (const a of auctions) {
      if (a.latitude === null || a.longitude === null || isNaN(a.latitude) || isNaN(a.longitude)) {
        continue;
      }
      if (seenIds.has(a.id)) continue;
      seenIds.add(a.id);

      if (a.is_portfolio_auction && a.expediente_number) {
        if (seenExp.has(a.expediente_number)) continue;
        seenExp.add(a.expediente_number);
      }

      list.push(a);
    }
    return list;
  }, [auctions]);

  const selectedAuction = validAuctions.find((a) => a.id === selectedAuctionId) || null;

  // Base map layer URLs
  const streetUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  const satelliteUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const activeTileUrl = mapLayer === 'satellite' ? satelliteUrl : streetUrl;

  const tileAttribution = mapLayer === 'satellite'
    ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  return (
    <div ref={containerRef} style={{ height }} className={`w-full h-full relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 shadow-inner ${className}`}>
      {/* Map Layer Switcher (Streets vs Satellite) & Full CR Reset */}
      <div className="absolute bottom-3 left-3 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-xl flex items-center gap-1 pointer-events-auto">
        <button
          type="button"
          onClick={() => setMapLayer('streets')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
            mapLayer === 'streets'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{language === 'es' ? 'Mapa' : 'Map'}</span>
        </button>
        <button
          type="button"
          onClick={() => setMapLayer('satellite')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
            mapLayer === 'satellite'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Satellite className="w-3.5 h-3.5" />
          <span>{language === 'es' ? 'Satélite' : 'Satellite'}</span>
        </button>
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

        <button
          type="button"
          onClick={() => {
            if (onSelectAuction) onSelectAuction(null);
            setResetTrigger((prev) => prev + 1);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-all active:scale-95 shadow-sm"
          title={language === 'es' ? 'Ver todo Costa Rica' : 'Reset view to all Costa Rica'}
        >
          <Compass className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{language === 'es' ? '🇨🇷 Todo CR' : '🇨🇷 Full CR'}</span>
        </button>
      </div>

      {/* Floating Cadastral Accuracy Banner (Top-Left under zoom controls) */}
      {selectedAuction && (
        <div className="absolute top-3 left-14 z-[400] pointer-events-auto max-w-[280px] sm:max-w-xs transition-all duration-300">
          {selectedAuction.location_type === 'exact_cadastral' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/90 text-emerald-200 border border-emerald-500/40 text-[11px] shadow-lg backdrop-blur-md">
              <span className="flex h-2 w-2 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <p className="leading-tight font-medium">
                {language === 'en'
                  ? '🎯 Official Cadastral Match — Exact property boundary from SNIT.'
                  : '🎯 Plano Catastrado Oficial — Linderos exactos del SNIT.'}
              </p>
            </div>
          ) : selectedAuction.location_type === 'approximate_town' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/90 text-amber-200 border border-amber-500/40 text-[11px] shadow-lg backdrop-blur-md">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <p className="leading-tight font-medium">
                {language === 'en'
                  ? '📍 General vicinity — exact location is unknown (Town center fallback).'
                  : '📍 Zona general — ubicación exacta desconocida (Centroide de la localidad).'}
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* Interactive Legend Overlay (Top-Right) */}
      <div className="absolute top-3 right-3 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-3 text-[11px] text-slate-700 dark:text-slate-300 shadow-2xl space-y-2.5 pointer-events-auto hidden md:block max-w-[215px]">
        {/* Stage Header */}
        <div>
          <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1.5 pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
            <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'es' ? 'Etapa de Remate' : 'Auction Call Stage'}</span>
          </p>
          <div className="space-y-1 pl-0.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block ring-2 ring-emerald-500/20" />
              <span>{language === 'es' ? '1° Remate (Base 100%)' : '1st Call (Base 100%)'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block ring-2 ring-yellow-500/20" />
              <span>{language === 'es' ? '2° Remate (-25% Base)' : '2nd Call (-25% Base)'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block ring-2 ring-orange-500/20" />
              <span>{language === 'es' ? '3° Remate (-75% Base)' : '3rd Call (-75% Base)'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600" />
              </span>
              <span>{language === 'es' ? 'En Progreso / Hoy' : 'Live / In Progress'}</span>
            </div>
          </div>
        </div>

        {/* Location Accuracy Header */}
        <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60">
          <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1.5">
            <Target className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'es' ? 'Precisión de Ubicación' : 'Location Accuracy'}</span>
          </p>
          <div className="space-y-1.5 pl-0.5">
            <div className="flex items-center gap-2">
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border border-white dark:border-slate-900 text-[8px] items-center justify-center font-black text-white shrink-0">
                ✓
              </span>
              <span className="leading-tight text-slate-900 dark:text-slate-200 font-medium">
                {language === 'es' ? 'Ubicación / Polígono Exacto' : 'Exact Location / Parcel'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-200 dark:bg-amber-800 border border-amber-400 dark:border-amber-600 shrink-0 inline-block" />
              <span className="leading-tight text-amber-700 dark:text-amber-400 font-medium">
                {language === 'es' ? 'Zona General (Desconocida)' : 'General Vicinity (Unknown)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
        zoomSnap={0.25}
        zoomDelta={0.5}
        minZoom={5.5}
      >
        <MapController
          center={center}
          zoom={zoom}
          selectedAuction={selectedAuction}
          selectedSubParcelIndex={selectedSubParcelIndex}
          resetTrigger={resetTrigger}
        />
        
        <TileLayer
          key={`${theme}-${mapLayer}`}
          attribution={tileAttribution}
          url={activeTileUrl}
          maxZoom={19}
        />

        {/* Render exact cadastral parcel polygon boundary for selected auction if available */}
        {selectedAuction?.parcel_polygon && (
          <GeoJSON
            key={`polygon-${selectedAuction.id}-${mapLayer}`}
            data={selectedAuction.parcel_polygon as any}
            style={{
              color: '#10b981',
              weight: 3.5,
              opacity: 0.95,
              fillColor: '#10b981',
              fillOpacity: mapLayer === 'satellite' ? 0.35 : 0.25,
              dashArray: '2, 4',
            }}
          />
        )}

        {validAuctions.map((auction) => {
          const isSelected = selectedAuctionId === auction.id;
          const isThisAuctionMinimized = activeMinimizedPinId === auction.id;
          const isAnyMinimized = Boolean(activeMinimizedPinId);
          const isCoLocated = selectedAuction
            ? isAuctionCoLocatedWithSelected(auction, selectedAuction)
            : false;

          // If this auction is not the selected auction and it is co-located with any parcel of the selected auction, hide it
          if (!isSelected && isCoLocated) {
            return null;
          }

          // If this is a portfolio auction with multiple sub-properties across Costa Rica:
          if (auction.is_portfolio_auction && auction.sub_properties && auction.sub_properties.length > 0) {
            const subPropsWithCoords = auction.sub_properties.filter(
              (sp): sp is SubPropertyParcel & { latitude: number; longitude: number } =>
                typeof sp.latitude === 'number' && typeof sp.longitude === 'number' && !isNaN(sp.latitude) && !isNaN(sp.longitude)
            );

            return (
              <React.Fragment key={`portfolio-group-${auction.id}`}>
                {/* Sub-property parcel polygons if available */}
                {subPropsWithCoords.map((sp) => {
                  if (!sp.parcel_polygon) return null;
                  const isThisSubSelected = selectedSubParcelIndex === sp.parcel_index;
                  return (
                    <GeoJSON
                      key={`polygon-${auction.id}-sub-${sp.parcel_index}`}
                      data={sp.parcel_polygon as any}
                      style={{
                        color: isThisSubSelected ? '#10b981' : '#0d9488',
                        weight: isThisSubSelected ? 3.5 : 2.5,
                        opacity: isThisSubSelected ? 1 : 0.9,
                        fillColor: isThisSubSelected ? '#10b981' : '#0d9488',
                        fillOpacity: isThisSubSelected ? 0.35 : 0.25,
                        dashArray: '2, 4',
                      }}
                    />
                  );
                })}

                {/* 4 Distinct Sub-Property Pins with Select & Move Aside ('x') options */}
                {subPropsWithCoords.map((sp) => {
                  const isSubSelected = selectedSubParcelIndex === sp.parcel_index;
                  const pinKey = `${auction.id}_sub_${sp.parcel_index}`;
                  const isSubMinimized = Boolean(
                    activeMinimizedPinId &&
                    (activeMinimizedPinId === pinKey ||
                     (activeMinimizedPinId === auction.id && isSubSelected) ||
                     (activeMinimizedPinId.startsWith(`${auction.id}_sub_`) && activeMinimizedPinId === pinKey))
                  );

                  const minimizedPos = getSubPropertyMinimizedPosition(sp);
                  const leaderColor = getLeaderColor(auction);

                  return (
                    <React.Fragment key={`sub-parcel-group-${pinKey}`}>
                      {/* Connecting Dashed Leader Line & Center Anchor Dot when minimized */}
                      {isSubMinimized && (
                        <>
                          <Polyline
                            key={`leader-${pinKey}`}
                            positions={[
                              [sp.latitude, sp.longitude],
                              minimizedPos,
                            ]}
                            pathOptions={{
                              color: leaderColor,
                              dashArray: '3, 4',
                              weight: 2,
                              opacity: 0.85,
                            }}
                          />
                          <CircleMarker
                            key={`anchor-${pinKey}`}
                            center={[sp.latitude, sp.longitude]}
                            radius={4}
                            pathOptions={{
                              color: '#ffffff',
                              fillColor: leaderColor,
                              fillOpacity: 1,
                              weight: 2,
                            }}
                          />
                        </>
                      )}

                      {/* Unified single Marker for this sub-property */}
                      <Marker
                        key={`marker-${pinKey}`}
                        position={isSubMinimized ? minimizedPos : [sp.latitude, sp.longitude]}
                        icon={
                          isSubMinimized
                            ? createSubPropertyMinimizedIcon(auction, sp)
                            : createSubPropertyIcon(auction, sp, isSelected, isSubSelected)
                        }
                        eventHandlers={{
                          click: (e) => {
                            if (isSubMinimized) {
                              L.DomEvent.stopPropagation(e as any);
                              setMinimizedPinId(null);
                              return;
                            }
                            const target = (e as any).originalEvent?.target as HTMLElement;
                            if (target && target.closest('.pin-close-btn')) {
                              return;
                            }
                            if (onSelectAuction) onSelectAuction(auction);
                            if (onSelectSubProperty) onSelectSubProperty(auction, sp);
                          },
                        }}
                      />
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          }

          // Single standard auction:
          const isThisAuctionMinimizedAndSelected = Boolean(isThisAuctionMinimized && isSelected);
          const minimizedPos = getMinimizedPosition(auction);
          const leaderColor = getLeaderColor(auction);
          const lat = auction.latitude!;
          const lng = auction.longitude!;

          return (
            <React.Fragment key={`auction-group-${auction.id}`}>
              {/* Connecting Dashed Leader Line & Center Anchor Dot when minimized */}
              {isThisAuctionMinimizedAndSelected && (
                <>
                  <Polyline
                    key={`leader-${auction.id}`}
                    positions={[
                      [lat, lng],
                      minimizedPos,
                    ]}
                    pathOptions={{
                      color: leaderColor,
                      dashArray: '3, 4',
                      weight: 2,
                      opacity: 0.85,
                    }}
                  />
                  <CircleMarker
                    key={`anchor-${auction.id}`}
                    center={[lat, lng]}
                    radius={4}
                    pathOptions={{
                      color: '#ffffff',
                      fillColor: leaderColor,
                      fillOpacity: 1,
                      weight: 2,
                    }}
                  />
                </>
              )}

              {/* Unified single Marker for this auction */}
              <Marker
                key={`marker-${auction.id}`}
                position={isThisAuctionMinimizedAndSelected ? minimizedPos : [lat, lng]}
                icon={
                  isThisAuctionMinimizedAndSelected
                    ? createMinimizedIcon(auction)
                    : createColorCodedIcon(auction, isSelected)
                }
                eventHandlers={{
                  click: (e) => {
                    if (isThisAuctionMinimizedAndSelected) {
                      L.DomEvent.stopPropagation(e as any);
                      setMinimizedPinId(null);
                      return;
                    }
                    const target = (e as any).originalEvent?.target as HTMLElement;
                    if (target && target.closest('.pin-close-btn')) {
                      return;
                    }
                    if (onSelectAuction) onSelectAuction(auction);
                  },
                }}
              />
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Map Micro-Notice Attribution Overlay */}
      <div className="absolute bottom-1 left-2 right-2 sm:left-auto sm:right-2 z-[400] max-w-md bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-lg px-2.5 py-1 text-[10px] text-slate-500 dark:text-slate-400 shadow-sm pointer-events-auto leading-tight flex items-center justify-between gap-2">
        <span className="truncate">{t.disclaimer.micro.text}</span>
        <Link href="/terms" target="_blank" className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0">
          {language === 'es' ? 'Aviso Legal' : 'Terms'}
        </Link>
      </div>
    </div>
  );
}
