'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { SearchResult, Station } from '@/types/station';

interface MapControllerProps {
  origins: Station[];
  results: SearchResult[];
  selectedStationCode?: string | null;
}

export function MapController({
  origins,
  results,
  selectedStationCode,
}: MapControllerProps) {
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

  // 選択駅が変わったら出発点と目的駅が全て収まる範囲にズーム
  useEffect(() => {
    if (!selectedStationCode) return;

    const selectedResult = results.find(
      (r) => r.station.code === selectedStationCode
    );
    if (selectedResult) {
      // 出発点と目的駅の座標を集める
      const points: [number, number][] = [
        ...origins.map((s) => [s.lat, s.lon] as [number, number]),
        [selectedResult.station.lat, selectedResult.station.lon],
      ];

      if (points.length > 0) {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [50, 50], animate: true });
      }
    }
  }, [selectedStationCode, results, origins, map]);

  return null;
}
