'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SearchResult, Station } from '@/types/station';

interface ResultsListProps {
  results: SearchResult[];
  count: number;
  isLoading: boolean;
  error: string | null;
  originStations?: Station[];
  timeMinutes?: number;
  mode?: 'or' | 'and';
}

export function ResultsList({
  results,
  count,
  isLoading,
  error,
  originStations = [],
  timeMinutes,
  mode,
}: ResultsListProps) {
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
        <CardTitle>検索結果 ({count}件)</CardTitle>
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
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            該当する駅が見つかりませんでした
          </p>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {results.map((result) => (
              <StationCard
                key={result.station.code}
                result={result}
                originCodesMap={originCodesMap}
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
}

function StationCard({ result, originCodesMap }: StationCardProps) {
  const { station, totalTime, timesFromOrigins } = result;

  return (
    <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg">{station.name}</h3>
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
      {Object.keys(timesFromOrigins).length > 1 && (
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
    </div>
  );
}
