'use client';

import { useState } from 'react';
import { SearchPanel, ResultsList, StationMapWrapper, useRangeSearch, useStations } from '@/features/range-search';
import type { SortOrder } from '@/features/range-search/components/ResultsList';
import type { OriginGroup } from '@/features/range-search/hooks/useRangeSearch';
import type { Station } from '@/types/station';

export default function Home() {
  const { data: stationsData } = useStations();
  const { results, count, isLoading, error, searchWithGroups } = useRangeSearch();
  const [selectedOrigins, setSelectedOrigins] = useState<Station[]>([]);
  const [searchParams, setSearchParams] = useState<{
    timeMinutes: number;
    mode: 'or' | 'and';
  } | null>(null);
  const [selectedStationCode, setSelectedStationCode] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const handleSearchWithGroups = (groups: OriginGroup[]) => {
    // 全グループの駅を取得（表示用）
    const stations = stationsData?.stations || [];
    const allOriginCodes = groups.flatMap((g) => g.origins);
    const originStations = allOriginCodes
      .map((code) => stations.find((s) => s.code === code))
      .filter((s): s is Station => s !== undefined);
    setSelectedOrigins(originStations);

    // 検索条件を保存（最大の時間を使用）
    const maxTime = Math.max(...groups.map((g) => g.timeMinutes));
    setSearchParams({ timeMinutes: maxTime, mode: groups.length > 1 ? 'and' : 'or' });

    // 選択駅をリセット
    setSelectedStationCode(null);

    searchWithGroups(groups);
  };

  const handleStationClick = (stationCode: string) => {
    // 同じ駅をクリックしたら選択解除、違う駅なら選択
    setSelectedStationCode((prev) => (prev === stationCode ? null : stationCode));
  };

  const handleSortToggle = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
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
            <SearchPanel onSearchWithGroups={handleSearchWithGroups} isLoading={isLoading} />
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
              sortOrder={sortOrder}
              onSortToggle={handleSortToggle}
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
