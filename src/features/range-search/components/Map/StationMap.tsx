'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { SearchResult, Station } from '@/types/station';
import { createIcon, originIcon, getColorByTime } from '../../function/Map/mapIcons';
import { MapController } from '../../controller/Map/MapController';
import { MapLegend } from './MapLegend';

interface StationMapProps {
  results: SearchResult[];
  originStations: Station[];
  maxTime: number;
  selectedStationCode?: string | null;
}

export function StationMap({ results, originStations, maxTime, selectedStationCode }: StationMapProps) {
  // 東京駅をデフォルトの中心に
  const defaultCenter: [number, number] = [35.6812, 139.7671];
  const defaultZoom = 11;

  return (
    <div className="h-[500px] w-full rounded-lg overflow-hidden border">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController
          origins={originStations}
          results={results}
          selectedStationCode={selectedStationCode}
        />

        {/* 到達可能駅のマーカー */}
        {results.map((result) => {
          const isSelected = result.station.code === selectedStationCode;
          return (
          <Marker
            key={result.station.code}
            position={[result.station.lat, result.station.lon]}
            icon={createIcon(getColorByTime(result.totalTime, maxTime), 12, isSelected)}
            zIndexOffset={isSelected ? 500 : 0}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-bold">{result.station.name}</div>
                <div className="text-gray-600">{result.totalTime}分</div>
                <div className="text-xs text-gray-500 mt-1">
                  {result.station.lines.slice(0, 3).map((l) => l.name).join(', ')}
                  {result.station.lines.length > 3 && ` 他${result.station.lines.length - 3}路線`}
                </div>
              </div>
            </Popup>
          </Marker>
          );
        })}

        {/* 起点駅のマーカー */}
        {originStations.map((station) => (
          <Marker
            key={`origin-${station.code}`}
            position={[station.lat, station.lon]}
            icon={originIcon}
            zIndexOffset={1000}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-bold text-red-600">📍 {station.name}</div>
                <div className="text-gray-600">起点駅</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <MapLegend maxTime={maxTime} />
    </div>
  );
}
