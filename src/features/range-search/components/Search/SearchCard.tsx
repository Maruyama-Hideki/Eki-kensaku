'use client';

import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Station } from '@/types/station';

export interface SearchCondition {
  id: number;
  selectedStations: Station[];
  timeMinutes: number;
}

export interface SearchCardProps {
  condition: SearchCondition;
  stations: Station[];
  isLoadingStations: boolean;
  allSelectedStations: Station[];
  onSelectStation: (station: Station) => void;
  onRemoveStation: (stationCode: string) => void;
  onTimeChange: (time: number) => void;
  onRemove?: () => void;
  cardIndex: number;
}

export function SearchCard({
  condition,
  stations,
  isLoadingStations,
  allSelectedStations,
  onSelectStation,
  onRemoveStation,
  onTimeChange,
  onRemove,
  cardIndex,
}: SearchCardProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 検索クエリでフィルタリング（全カードで選択済みの駅を除外）
  const filteredStations = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return stations
      .filter(
        (s) =>
          s.name.toLowerCase().includes(query) &&
          !allSelectedStations.some((sel) => sel.code === s.code)
      )
      .slice(0, 50);
  }, [stations, searchQuery, allSelectedStations]);

  const handleSelectStation = (station: Station) => {
    onSelectStation(station);
    setSearchQuery('');
  };

  return (
    <Card>
      <CardContent className="pt-2 space-y-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">出発地 {cardIndex}</Label>
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              onClick={onRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* 起点駅選択 */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">周辺の駅（複数入力可）</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled={isLoadingStations}
              >
                {isLoadingStations
                  ? '駅データを読み込み中...'
                  : '駅名を入力して検索'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="駅名を入力..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <CommandList>
                  <CommandEmpty>
                    {searchQuery ? '駅が見つかりません' : '駅名を入力してください'}
                  </CommandEmpty>
                  <CommandGroup>
                    {filteredStations.map((station) => (
                      <CommandItem
                        key={station.code}
                        value={station.code}
                        onSelect={() => {
                          handleSelectStation(station);
                          setOpen(false);
                        }}
                      >
                        <span>{station.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {station.lines[0]?.company}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* 選択された駅 */}
          <div className="flex flex-wrap gap-2 mt-2">
            {condition.selectedStations.map((station) => (
              <Badge
                key={station.code}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => onRemoveStation(station.code)}
              >
                {station.name} ×
              </Badge>
            ))}
          </div>
        </div>

        {/* 時間スライダー */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            最大所要時間: {condition.timeMinutes}分
          </Label>
          <Slider
            value={[condition.timeMinutes]}
            onValueChange={(value) => onTimeChange(value[0])}
            min={5}
            max={120}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>5分</span>
            <span>120分</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
