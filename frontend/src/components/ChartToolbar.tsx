import { Camera, Maximize2, Download } from "lucide-react";

interface ChartToolbarProps {
  onExportPng: () => void;
  onEnlarge?: () => void;
  onExportCsv: () => void;
}

export function ChartToolbar({
  onExportPng,
  onEnlarge,
  onExportCsv,
}: ChartToolbarProps) {
  return (
    <div className="flex gap-2">
      <button onClick={onExportPng} className="toolbar-btn" title="导出PNG">
        <Camera className="h-3.5 w-3.5" />
      </button>
      <button onClick={onExportCsv} className="toolbar-btn" title="导出CSV">
        <Download className="h-3.5 w-3.5" />
      </button>
      {onEnlarge && (
        <button onClick={onEnlarge} className="toolbar-btn" title="Enlarge">
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
