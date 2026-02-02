'use client';

import { useQuery } from '@tanstack/react-query';
import type { Station } from '@/types/station';

interface StationsMasterResponse {
  stations: Station[];
  count: number;
}

async function fetchStations(): Promise<StationsMasterResponse> {
  const response = await fetch('/api/stations/master');
  if (!response.ok) {
    throw new Error('駅データの取得に失敗しました');
  }
  return response.json();
}

export function useStations() {
  return useQuery({
    queryKey: ['stations', 'master'],
    queryFn: fetchStations,
    staleTime: Infinity, // 駅マスターは変わらないので無限にキャッシュ
    gcTime: Infinity,
  });
}
