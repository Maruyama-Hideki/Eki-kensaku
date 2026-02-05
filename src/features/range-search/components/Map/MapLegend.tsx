'use client';

interface MapLegendProps {
  maxTime: number;
}


/**
 *
 * @description
 * マップ右下のアイコン別距離を表示するコンポーネント
 */
export function MapLegend({ maxTime }: MapLegendProps) {
  return (
    <div className="absolute bottom-4 right-4 bg-white p-2 rounded shadow-md text-xs z-[1000]">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white"></div>
        <span>起点駅</span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
        <span>〜{Math.round(maxTime * 0.33)}分</span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
        <span>〜{Math.round(maxTime * 0.66)}分</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
        <span>〜{maxTime}分</span>
      </div>
    </div>
  );
}
