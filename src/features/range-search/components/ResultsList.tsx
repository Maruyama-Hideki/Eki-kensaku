'use client';

import { useMemo, useState, useEffect } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SearchResult, Station, RouteStep } from '@/types/station';

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
            <div className="flex flex-wrap gap-1">
              <Button
                variant={selectedLine === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedLine(null)}
                className="text-xs h-7 px-2"
              >
                すべて
                <span className="ml-1 text-muted-foreground">({count})</span>
              </Button>
              {lineStats.map(({ line, count: lineCount }) => (
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

interface StationCardProps {
  result: SearchResult;
  originCodesMap: Map<string, string>;
  isSelected?: boolean;
  onStationClick?: (stationCode: string) => void;
}

function StationCard({ result, originCodesMap, isSelected, onStationClick }: StationCardProps) {
  const { station, totalTime, timesFromOrigins, routesFromOrigins } = result;

  const handleClick = () => {
    onStationClick?.(station.code);
  };

  // 経路を連続する同一路線でグループ化して簡略表示
  const formatRoute = (route: { from: string; to: string; line: string; time: number }[]) => {
    if (!route || route.length === 0) return null;

    // 連続する同一路線をグループ化
    const segments: { from: string; to: string; line: string }[] = [];
    let currentSegment = { from: route[0].from, to: route[0].to, line: route[0].line };

    for (let i = 1; i < route.length; i++) {
      if (route[i].line === currentSegment.line) {
        // 同じ路線なら終点を更新
        currentSegment.to = route[i].to;
      } else {
        // 路線が変わったら現在のセグメントを保存して新しいセグメント開始
        segments.push({ ...currentSegment });
        currentSegment = { from: route[i].from, to: route[i].to, line: route[i].line };
      }
    }
    segments.push(currentSegment);

    return segments;
  };

  return (
    <div
      className={`border rounded-lg p-4 transition-colors cursor-pointer ${
        isSelected
          ? 'bg-primary/10 border-primary ring-2 ring-primary/30'
          : 'hover:bg-muted/50'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className={`font-semibold text-lg ${isSelected ? 'text-primary' : ''}`}>
            {station.name}
          </h3>
          <div className="flex flex-wrap gap-1 mt-1">
            {station.lines.slice(0, 5).map((line) => (
              <Badge key={line.code} variant="outline" className="text-xs">
                {line.name}
              </Badge>
            ))}
            {station.lines.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{station.lines.length - 5}
              </Badge>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-primary">{totalTime}</span>
          <span className="text-sm text-muted-foreground">分</span>
        </div>
      </div>

      {/* 各起点からの時間 */}
      {Object.keys(timesFromOrigins).length >= 1 && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-muted-foreground mb-1">各起点からの時間:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(timesFromOrigins).map(([originCode, time]) => {
              const originName = originCodesMap.get(originCode) || originCode;
              return (
                <span key={originCode} className="text-sm">
                  {originName}: {time}分
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* 各起点からの経路 */}
      {routesFromOrigins && Object.keys(routesFromOrigins).length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-muted-foreground mb-1">経路:</p>
          <div className="space-y-1">
            {Object.entries(routesFromOrigins).map(([originCode, route]) => {
              const segments = formatRoute(route);
              if (!segments || segments.length === 0) return null;
              return (
                <div key={originCode} className="text-sm text-foreground">
                  {segments.map((seg, idx) => (
                    <span key={idx}>
                      {idx === 0 ? seg.from : ''}→{seg.to}
                      <span className="text-muted-foreground">({seg.line})</span>
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
