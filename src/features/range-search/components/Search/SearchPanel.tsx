'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStations } from '../../hooks/useStations';
import { SearchCard, type SearchCondition } from './SearchCard';
import type { Station } from '@/types/station';
import type { OriginGroup } from '../../hooks/useRangeSearch';

interface SearchPanelProps {
  onSearchWithGroups: (groups: OriginGroup[]) => void;
  isLoading: boolean;
}

export function SearchPanel({ onSearchWithGroups, isLoading }: SearchPanelProps) {
  const { data: stationsData, isLoading: isLoadingStations } = useStations();
  const [conditions, setConditions] = useState<SearchCondition[]>([
    { id: 1, selectedStations: [], timeMinutes: 30 },
  ]);
  const [nextId, setNextId] = useState(2);

  const stations = stationsData?.stations || [];

  // カードを追加
  const handleAddCard = () => {
    setConditions((prev) => [
      ...prev,
      { id: nextId, selectedStations: [], timeMinutes: 30 },
    ]);
    setNextId((prev) => prev + 1);
  };

  // カードを削除
  const handleRemoveCard = (id: number) => {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  };

  // 駅を選択
  const handleSelectStation = (id: number, station: Station) => {
    setConditions((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, selectedStations: [...c.selectedStations, station] }
          : c
      )
    );
  };

  // 駅を削除
  const handleRemoveStation = (id: number, stationCode: string) => {
    setConditions((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              selectedStations: c.selectedStations.filter(
                (s) => s.code !== stationCode
              ),
            }
          : c
      )
    );
  };

  // 時間を変更
  const handleTimeChange = (id: number, time: number) => {
    setConditions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, timeMinutes: time } : c))
    );
  };

  // 検索実行
  const handleSearch = () => {
    // 駅が選択されているカードのみをグループとして抽出
    const groups: OriginGroup[] = conditions
      .filter((c) => c.selectedStations.length > 0)
      .map((c) => ({
        origins: c.selectedStations.map((s) => s.code),
        timeMinutes: c.timeMinutes,
      }));

    if (groups.length === 0) return;

    onSearchWithGroups(groups);
  };

  // 全カードに選択された駅があるかチェック
  const hasAnyStations = conditions.some((c) => c.selectedStations.length > 0);

  return (
    <>
      <div className="space-y-3">
        {conditions.map((condition, index) => (
          <SearchCard
            key={condition.id}
            condition={condition}
            stations={stations}
            isLoadingStations={isLoadingStations}
            allSelectedStations={conditions.flatMap((c) => c.selectedStations)}
            onSelectStation={(station) =>
              handleSelectStation(condition.id, station)
            }
            onRemoveStation={(stationCode) =>
              handleRemoveStation(condition.id, stationCode)
            }
            onTimeChange={(time) => handleTimeChange(condition.id, time)}
            onRemove={
              conditions.length > 1
                ? () => handleRemoveCard(condition.id)
                : undefined
            }
            cardIndex={index + 1}
          />
        ))}

        {/* カード追加ボタン */}
        <Button
          variant="outline"
          className="w-full border-dashed"
          onClick={handleAddCard}
        >
          <Plus className="h-4 w-4 mr-2" />
          出発地を追加
        </Button>
      </div>

      {/* 検索ボタン */}
      <Button
        onClick={handleSearch}
        disabled={!hasAnyStations || isLoading}
        className="w-full mt-4"
        size="lg"
      >
        {isLoading ? '検索中...' : '検索'}
      </Button>
    </>
  );
}
