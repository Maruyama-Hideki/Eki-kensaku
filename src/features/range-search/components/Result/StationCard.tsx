'use client';

import { Badge } from '@/components/ui/badge';
import type { SearchResult } from '@/types/station';

export interface StationCardProps {
  result: SearchResult;
  originCodesMap: Map<string, string>;
  isSelected?: boolean;
  onStationClick?: (stationCode: string) => void;
}

export function StationCard({ result, originCodesMap, isSelected, onStationClick }: StationCardProps) {
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
