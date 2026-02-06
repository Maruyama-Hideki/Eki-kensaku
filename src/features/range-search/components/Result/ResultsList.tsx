'use client';

import { useMemo, useState, useEffect } from 'react';
import { ArrowUpDown, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StationCard } from './StationCard';
import type { SearchResult, Station } from '@/types/station';

export type SortOrder = 'asc' | 'desc';

// 結果から最後に乗る路線を取得
function getLastLine(result: SearchResult): string | null {
  if (!result.routesFromOrigins) return null;

  // 最短経路の最後の路線を取得
  const routes = Object.values(result.routesFromOrigins);
  if (routes.length === 0) return null;

  // 最初の起点からの経路を使用（最短のもの）
  const firstRoute = routes[0];
  if (!firstRoute || firstRoute.length === 0) return null;

  return firstRoute[firstRoute.length - 1].line;
}

interface ResultsListProps {
  results: SearchResult[];
  count: number;
  isLoading: boolean;
  error: string | null;
  originStations?: Station[];
  timeMinutes?: number;
  mode?: 'or' | 'and';
  selectedStationCode?: string | null;
  onStationClick?: (stationCode: string) => void;
  sortOrder?: SortOrder;
  onSortToggle?: () => void;
}

export function ResultsList({
  results,
  count,
  isLoading,
  error,
  originStations = [],
  timeMinutes,
  mode,
  selectedStationCode,
  onStationClick,
  sortOrder = 'asc',
  onSortToggle,
}: ResultsListProps) {
  const [selectedLine, setSelectedLine] = useState<string | null>(null);

  // 検索結果が変わったら路線フィルターをリセット
  useEffect(() => {
    setSelectedLine(null);
  }, [results]);

  // 路線ごとの駅数を集計（降順でソート）
  const lineStats = useMemo(() => {
    const lineCounts = new Map<string, number>();

    for (const result of results) {
      const lastLine = getLastLine(result);
      if (lastLine) {
        lineCounts.set(lastLine, (lineCounts.get(lastLine) || 0) + 1);
      }
    }

    // 駅数の降順でソート
    return Array.from(lineCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([line, count]) => ({ line, count }));
  }, [results]);

  // フィルタリングとソート
  const sortedResults = useMemo(() => {
    let filtered = results;

    // 路線でフィルタリング
    if (selectedLine) {
      filtered = results.filter((result) => getLastLine(result) === selectedLine);
    }

    // 時間でソート
    if (sortOrder === 'asc') {
      return [...filtered].sort((a, b) => a.totalTime - b.totalTime);
    }
    return [...filtered].sort((a, b) => b.totalTime - a.totalTime);
  }, [results, sortOrder, selectedLine]);

  // 路線フィルターをリセット
  const handleLineClick = (line: string) => {
    setSelectedLine((prev) => (prev === line ? null : line));
  };
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3">検索中...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // 検索前（起点駅が未選択）
  if (originStations.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">
            検索条件を設定して検索してください
          </p>
        </CardContent>
      </Card>
    );
  }

  // 検索後だが結果が0件
  if (count === 0 && results.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">
            条件にあう駅が見つかりませんでした
          </p>
        </CardContent>
      </Card>
    );
  }

  // 起点駅のコードマップを作成
  const originCodesMap = new Map(originStations.map((s) => [s.code, s.name]));

  // 検索条件の表示テキスト
  const originNames = originStations.map((s) => s.name).join('、');
  const modeText = mode === 'and' ? 'すべてから' : 'いずれかから';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            検索結果 ({selectedLine ? `${sortedResults.length}/${count}` : count}件)
            {selectedLine && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                - {selectedLine}
              </span>
            )}
          </CardTitle>
          {results.length > 0 && onSortToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSortToggle}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <ArrowUpDown className="h-4 w-4" />
              <span className="text-xs">
                {sortOrder === 'asc' ? '早い順' : '遅い順'}
              </span>
            </Button>
          )}
        </div>
        {originStations.length > 0 && timeMinutes && (
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-medium text-foreground">{originNames}</span>
            {originStations.length > 1 && (
              <span className="mx-1">の{modeText}</span>
            )}
            から
            <span className="font-medium text-foreground mx-1">{timeMinutes}分</span>
            以内
          </p>
        )}
        {/* 路線フィルター */}
        {lineStats.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-2">到着路線で絞り込み:</p>
            <div className="flex flex-wrap gap-1 items-center">
              {/* すべて */}
              <Button
                variant={selectedLine === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedLine(null)}
                className="text-xs h-7 px-2"
              >
                すべて
                <span className="ml-1 text-muted-foreground">({count})</span>
              </Button>
              {/* 上位3路線 */}
              {lineStats.slice(0, 3).map(({ line, count: lineCount }) => (
                <Button
                  key={line}
                  variant={selectedLine === line ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleLineClick(line)}
                  className="text-xs h-7 px-2"
                >
                  {line}
                  <span className="ml-1 text-muted-foreground">({lineCount})</span>
                </Button>
              ))}
              {/* その他の路線（プルダウン） */}
              {lineStats.length > 3 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={selectedLine && !lineStats.slice(0, 3).some(l => l.line === selectedLine) ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs h-7 px-2"
                    >
                      {selectedLine && !lineStats.slice(0, 3).some(l => l.line === selectedLine)
                        ? selectedLine
                        : 'その他'}
                      <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start">
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {lineStats.slice(3).map(({ line, count: lineCount }) => (
                        <Button
                          key={line}
                          variant={selectedLine === line ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => handleLineClick(line)}
                          className="w-full justify-between text-xs h-8"
                        >
                          <span className="truncate">{line}</span>
                          <span className="text-muted-foreground ml-2">({lineCount})</span>
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {sortedResults.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            該当する駅が見つかりませんでした
          </p>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {sortedResults.map((result) => (
              <StationCard
                key={result.station.code}
                result={result}
                originCodesMap={originCodesMap}
                isSelected={selectedStationCode === result.station.code}
                onStationClick={onStationClick}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
