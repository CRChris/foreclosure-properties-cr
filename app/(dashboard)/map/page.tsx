'use client';

import React, { useState, useEffect } from 'react';
import { Auction, CostaRicaProvince } from '@/lib/types/auction';
import { MapWrapper } from '@/components/map/MapWrapper';
import { formatCurrency, formatArea } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { fetchAuctions } from '@/lib/supabase/db';
import Link from 'next/link';
import { 
  MapPin, 
  Search, 
  ArrowRight, 
  Maximize2, 
  Scale, 
  TrendingUp, 
  Compass,
} from 'lucide-react';

export default function MapExplorerPage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<CostaRicaProvince | 'all'>('all');

  useEffect(() => {
    fetchAuctions().then((data) => {
      if (data && data.length > 0) {
        setAuctions(data);
        setSelectedAuction(data[0]);
      }
    });

    fetch('/api/auctions')
      .then((r) => r.json())
      .then((res) => {
        if (res && Array.isArray(res.data) && res.data.length > 0) {
          setAuctions(res.data);
          setSelectedAuction(res.data[0]);
        }
      })
      .catch(() => {});
  }, []);

  const filteredAuctions = auctions.filter((auction) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        auction.canton.toLowerCase().includes(q) ||
        auction.district.toLowerCase().includes(q) ||
        auction.province.toLowerCase().includes(q) ||
        auction.folio_real.toLowerCase().includes(q) ||
        auction.expediente_number.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (selectedProvince !== 'all' && auction.province !== selectedProvince) {
      return false;
    }
    return true;
  });

  const centerCoordinates: [number, number] = selectedAuction?.latitude && selectedAuction?.longitude
    ? [selectedAuction.latitude, selectedAuction.longitude]
    : [9.7489, -83.7534];

  return (
    <div className="space-y-4">
      {/* Top Map Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Compass className="w-6 h-6 text-emerald-400" />
            <span>Explorador Geoespacial de Remates</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Georreferenciación de subastas judiciales en Costa Rica con coordenadas PostGIS.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success" size="sm">
            {filteredAuctions.length} Marcadores en Mapa
          </Badge>
        </div>
      </div>

      {/* Main Map Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-210px)] min-h-[600px]">
        {/* Left Column: Properties Sidebar */}
        <div className="lg:col-span-4 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
          {/* Search bar inside sidebar */}
          <div className="p-3 border-b border-slate-800 space-y-2 bg-slate-950/60">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cantón o folio..."
              icon={<Search className="w-4 h-4" />}
              className="text-xs py-1.5"
            />
            <Select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value as any)}
              className="text-xs py-1.5"
            >
              <option value="all">Todas las Provincias</option>
              <option value="San José">San José</option>
              <option value="Alajuela">Alajuela</option>
              <option value="Cartago">Cartago</option>
              <option value="Heredia">Heredia</option>
              <option value="Guanacaste">Guanacaste</option>
              <option value="Puntarenas">Puntarenas</option>
              <option value="Limón">Limón</option>
            </Select>
          </div>

          {/* Properties Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800 p-2 space-y-2">
            {filteredAuctions.length > 0 ? (
              filteredAuctions.map((auction) => {
                const isSelected = selectedAuction?.id === auction.id;
                return (
                  <div
                    key={auction.id}
                    onClick={() => setSelectedAuction(auction)}
                    className={`p-3 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800/90 border border-emerald-500/80 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-slate-950/40 hover:bg-slate-800/40 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white truncate">
                        {auction.district}, {auction.canton}
                      </span>
                      <Badge variant={isSelected ? 'success' : 'default'} size="sm">
                        {auction.province}
                      </Badge>
                    </div>

                    <div className="flex items-baseline justify-between mt-2">
                      <span className="text-sm font-extrabold text-emerald-400">
                        {formatCurrency(auction.base_price_call_1, auction.currency)}
                      </span>
                      {auction.estimated_margin_pct && (
                        <span className="text-[11px] font-semibold text-emerald-300">
                          +{auction.estimated_margin_pct}% Margen
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/60">
                      <span className="flex items-center gap-1">
                        <Maximize2 className="w-3 h-3 text-slate-500" />
                        {formatArea(auction.area_m2)}
                      </span>
                      <span className="font-mono text-slate-400">
                        {auction.folio_real}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center space-y-2 text-slate-400">
                <Scale className="w-6 h-6 mx-auto text-slate-500" />
                <p className="text-xs font-semibold text-white">Base de datos lista</p>
                <p className="text-[11px] text-slate-500">
                  Esperando nueva publicación judicial del Boletín Oficial.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Full-Height Interactive Map */}
        <div className="lg:col-span-8 relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
          <MapWrapper
            auctions={filteredAuctions}
            selectedAuctionId={selectedAuction?.id}
            onSelectAuction={(auction) => setSelectedAuction(auction)}
            center={centerCoordinates}
            zoom={selectedAuction ? 13 : 8}
            height="100%"
          />

          {/* Floating Action Card for selected property */}
          {selectedAuction && (
            <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-slate-950/95 border border-slate-800 rounded-xl p-3.5 shadow-2xl backdrop-blur-md z-[1000] space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase font-bold text-emerald-400">
                    {selectedAuction.canton}, {selectedAuction.province}
                  </p>
                  <p className="text-xs font-bold text-white line-clamp-1">
                    {selectedAuction.address_description || selectedAuction.district}
                  </p>
                </div>
                <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                  {selectedAuction.currency}
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <span className="text-base font-extrabold text-white">
                  {formatCurrency(selectedAuction.base_price_call_1, selectedAuction.currency)}
                </span>
                <span className="text-xs text-slate-400">
                  {formatArea(selectedAuction.area_m2)}
                </span>
              </div>

              <Link
                href={`/auctions/${selectedAuction.id}`}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors shadow-md"
              >
                <span>Ver Análisis y Expediente Completo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
