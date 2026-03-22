import { useState } from "react";
import type { ReactNode } from "react";
import { Dialog, DialogContent } from "./ui/dialog";
import { ChartToolbar } from "./ChartToolbar";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  tabs?: ReactNode;
  children: ReactNode;
  onExportPng: () => void;
  onExportCsv: () => void;
}

export function ChartCard({
  title,
  subtitle,
  tabs,
  children,
  onExportPng,
  onExportCsv,
}: ChartCardProps) {
  const [isEnlarged, setIsEnlarged] = useState(false);

  return (
    <>
      <div className="chart-section group">
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h3 className="section-label shrink-0">{title}</h3>
              <ChartToolbar
                onExportPng={onExportPng}
                onEnlarge={() => setIsEnlarged(true)}
                onExportCsv={onExportCsv}
              />
            </div>
            {subtitle && (
              <p className="text-xs text-[var(--fg-muted)] mt-0.5">{subtitle}</p>
            )}
          </div>
          {tabs && <div className="shrink-0 ml-4">{tabs}</div>}
        </div>
        {children}
      </div>

      <Dialog open={isEnlarged} onOpenChange={setIsEnlarged}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-auto">
          <div className="flex items-start justify-between mb-3 mt-2">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h3 className="section-label shrink-0">{title}</h3>
                <ChartToolbar
                  onExportPng={onExportPng}
                  onExportCsv={onExportCsv}
                />
              </div>
            </div>
            {tabs && <div className="shrink-0 ml-4">{tabs}</div>}
          </div>
          <div>{children}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}
