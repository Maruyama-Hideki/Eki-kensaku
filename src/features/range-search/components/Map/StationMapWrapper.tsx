'use client';

import dynamic from 'next/dynamic';
import type { SearchResult, Station } from '@/types/station';

// Leafletはクライアントサイドでのみ動作するためdynamic import
const StationMap = dynamic(
  () => import('./StationMap').then((mod) => mod.StationMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] w-full rounded-lg border bg-muted flex items-center justify-center">
        <div className="text-muted-foreground">地図を読み込み中...</div>
      </div>
    ),
  }
);

interface StationMapWrapperProps {
  results: SearchResult[];
  originStations: Station[];
  maxTime: number;
  selectedStationCode?: string | null;
}

export function StationMapWrapper({
  results,
  originStations,
  maxTime,
  selectedStationCode,
}: StationMapWrapperProps) {
  return (
    <StationMap
      results={results}
      originStations={originStations}
      maxTime={maxTime}
      selectedStationCode={selectedStationCode}
    />
  );
}
