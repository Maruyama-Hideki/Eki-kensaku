'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { SearchResult, Station, RouteStep } from '@/types/station';

// デフォルトマーカーアイコンの修正（Leafletのバグ対策）
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// カスタムアイコン作成
function createIcon(color: string, size: number = 12, isSelected: boolean = false): L.DivIcon {
  if (isSelected) {
    // 選択された駅用の大きなアニメーション付きアイコン
    return L.divIcon({
      className: 'selected-marker',
      html: `<div style="
        position: relative;
        width: 24px;
        height: 24px;
      ">
        <div style="
          position: absolute;
          top: 0;
          left: 0;
          background-color: ${color};
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 3px solid #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3), 0 4px 8px rgba(0,0,0,0.4);
          animation: pulse 1.5s ease-in-out infinite;
        "></div>
        <style>
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.8; }
          }
        </style>
      </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  }
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// 起点駅用アイコン
const originIcon = L.divIcon({
  className: 'origin-marker',
  html: `<div style="
    background-color: #ef4444;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <div style="
      width: 8px;
      height: 8px;
      background-color: white;
      border-radius: 50%;
    "></div>
  </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// 時間に応じた色を取得
function getColorByTime(time: number, maxTime: number): string {
  const ratio = time / maxTime;
  if (ratio <= 0.33) return '#22c55e'; // 緑（近い）
  if (ratio <= 0.66) return '#eab308'; // 黄（中間）
  return '#f97316'; // オレンジ（遠い）
}

// マップの中心を調整するコンポーネント
function MapController({
  origins,
  results,
  selectedStationCode,
}: {
  origins: Station[];
  results: SearchResult[];
  selectedStationCode?: string | null;
}) {
  const map = useMap();

  // 初期表示: 全体が見えるようにフィット
  useEffect(() => {
    if (origins.length === 0 && results.length === 0) return;

    const allPoints: [number, number][] = [
      ...origins.map((s) => [s.lat, s.lon] as [number, number]),
      ...results.map((r) => [r.station.lat, r.station.lon] as [number, number]),
    ];

    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [origins, results, map]);

  // 選択駅が変わったらその駅にパン
  useEffect(() => {
    if (!selectedStationCode) return;

    const selectedResult = results.find(
      (r) => r.station.code === selectedStationCode
    );
    if (selectedResult) {
      map.setView(
        [selectedResult.station.lat, selectedResult.station.lon],
        14,
        { animate: true }
      );
    }
  }, [selectedStationCode, results, map]);

  return null;
}

// 起点ごとの経路線の色
const routeColors = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
];

interface StationMapProps {
  results: SearchResult[];
  originStations: Station[];
  maxTime: number;
  selectedStationCode?: string | null;
  selectedRoutes?: Record<string, RouteStep[]> | null;
}

export function StationMap({ results, originStations, maxTime, selectedStationCode, selectedRoutes }: StationMapProps) {
  // 東京駅をデフォルトの中心に
  const defaultCenter: [number, number] = [35.6812, 139.7671];
  const defaultZoom = 11;

  // 駅コードから座標を取得するマップを作成
  const stationCoordMap = useMemo(() => {
    const map = new Map<string, [number, number]>();
    // 起点駅を追加
    for (const station of originStations) {
      map.set(station.code, [station.lat, station.lon]);
    }
    // 結果の駅を追加
    for (const result of results) {
      map.set(result.station.code, [result.station.lat, result.station.lon]);
    }
    return map;
  }, [originStations, results]);

  // 経路から座標の配列を生成
  const routePolylines = useMemo(() => {
    if (!selectedRoutes) return [];

    const polylines: { originCode: string; positions: [number, number][]; color: string }[] = [];
    const originCodes = Object.keys(selectedRoutes);

    originCodes.forEach((originCode, index) => {
      const route = selectedRoutes[originCode];
      if (!route || route.length === 0) return;

      const positions: [number, number][] = [];

      // 最初の駅を追加
      const firstCoord = stationCoordMap.get(route[0].fromCode);
      if (firstCoord) {
        positions.push(firstCoord);
      }

      // 各ステップの到着駅を追加
      for (const step of route) {
        const coord = stationCoordMap.get(step.toCode);
        if (coord) {
          positions.push(coord);
        }
      }

      if (positions.length >= 2) {
        polylines.push({
          originCode,
          positions,
          color: routeColors[index % routeColors.length],
        });
      }
    });

    return polylines;
  }, [selectedRoutes, stationCoordMap]);

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

        {/* 選択された駅への経路線 */}
        {routePolylines.map((polyline) => (
          <Polyline
            key={`route-${polyline.originCode}`}
            positions={polyline.positions}
            pathOptions={{
              color: polyline.color,
              weight: 4,
              opacity: 0.8,
            }}
          />
        ))}

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

      {/* 凡例 */}
      <div className="absolute bottom-4 right-4 bg-white p-2 rounded shadow-md text-xs z-[1000]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white"></div>
          <span>起点駅</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>〜{Math.round(maxTime * 0.33)}分</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span>〜{Math.round(maxTime * 0.66)}分</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span>〜{maxTime}分</span>
        </div>
      </div>
    </div>
  );
}
