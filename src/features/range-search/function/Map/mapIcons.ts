import L from 'leaflet';

// デフォルトマーカーアイコンの修正（Leafletのバグ対策）
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// カスタムアイコン作成
export function createIcon(color: string, size: number = 12, isSelected: boolean = false): L.DivIcon {
  if (isSelected) {
    // 選択された駅用の大きなアニメーション付きアイコン
    return L.divIcon({
      className: 'selected-marker',
      html: `<div style="
        position: relative;
        width: 24px;
        height: 24px;
      ">
        <div style="
          position: absolute;
          top: 0;
          left: 0;
          background-color: ${color};
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 3px solid #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3), 0 4px 8px rgba(0,0,0,0.4);
          animation: pulse 1.5s ease-in-out infinite;
        "></div>
        <style>
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.8; }
          }
        </style>
      </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  }
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// 起点駅用アイコン
export const originIcon = L.divIcon({
  className: 'origin-marker',
  html: `<div style="
    background-color: #ef4444;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <div style="
      width: 8px;
      height: 8px;
      background-color: white;
      border-radius: 50%;
    "></div>
  </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// 時間に応じた色を取得
export function getColorByTime(time: number, maxTime: number): string {
  const ratio = time / maxTime;
  if (ratio <= 0.33) return '#22c55e'; // 緑（近い）
  if (ratio <= 0.66) return '#eab308'; // 黄（中間）
  return '#f97316'; // オレンジ（遠い）
}
