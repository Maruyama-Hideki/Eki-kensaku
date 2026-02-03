'use client';

import { useState } from 'react';
import { SearchPanel, ResultsList, StationMapWrapper, useRangeSearch, useStations } from '@/features/range-search';
import type { Station } from '@/types/station';

export default function Home() {
  const { data: stationsData } = useStations();
  const { results, count, isLoading, error, search } = useRangeSearch();
  const [selectedOrigins, setSelectedOrigins] = useState<Station[]>([]);
  const [searchParams, setSearchParams] = useState<{
    timeMinutes: number;
    mode: 'or' | 'and';
  } | null>(null);
  const [selectedStationCode, setSelectedStationCode] = useState<string | null>(null);

  const handleSearch = (origins: string[], timeMinutes: number, mode: 'or' | 'and') => {
    // 選択された起点駅を保存（結果表示用）
    const stations = stationsData?.stations || [];
    const originStations = origins
      .map((code) => stations.find((s) => s.code === code))
      .filter((s): s is Station => s !== undefined);
    setSelectedOrigins(originStations);

    // 検索条件を保存
    setSearchParams({ timeMinutes, mode });

    // 選択駅をリセット
    setSelectedStationCode(null);

    search(origins, timeMinutes, mode);
  };

  const handleStationClick = (stationCode: string) => {
    // 同じ駅をクリックしたら選択解除、違う駅なら選択
    setSelectedStationCode((prev) => (prev === stationCode ? null : stationCode));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">駅範囲検索</h1>
          <p className="text-muted-foreground">
            指定した時間内に到達可能な駅を検索します
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 検索パネル */}
          <div className="lg:col-span-1">
            <SearchPanel onSearch={handleSearch} isLoading={isLoading} />
          </div>

          {/* 検索結果 */}
          <div className="lg:col-span-2">
            <ResultsList
              results={results}
              count={count}
              isLoading={isLoading}
              error={error}
              originStations={selectedOrigins}
              timeMinutes={searchParams?.timeMinutes}
              mode={searchParams?.mode}
              selectedStationCode={selectedStationCode}
              onStationClick={handleStationClick}
            />
          </div>
        </div>

        {/* 地図表示 */}
        {results.length > 0 && searchParams && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-3">検索結果マップ</h2>
            <div className="relative">
              <StationMapWrapper
                results={results}
                originStations={selectedOrigins}
                maxTime={searchParams.timeMinutes}
                selectedStationCode={selectedStationCode}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
