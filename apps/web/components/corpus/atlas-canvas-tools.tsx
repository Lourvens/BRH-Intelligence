"use client";

import type { RefObject } from "react";
import {
  Expand,
  Maximize,
  Minimize,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AtlasControls } from "./atlas-network";

export function AtlasCanvasTools({
  controls,
  fullscreen,
  toggleFullscreen,
  reset,
  disabled,
}: {
  controls: RefObject<AtlasControls | null>;
  fullscreen: boolean;
  toggleFullscreen: () => void;
  reset: () => void;
  disabled: boolean;
}) {
  const actions = [
    {
      id: "zoom-in",
      label: "Zoom avant",
      icon: Plus,
      action: () => controls.current?.zoom(1.3),
      camera: true,
    },
    {
      id: "zoom-out",
      label: "Zoom arrière",
      icon: Minus,
      action: () => controls.current?.zoom(0.77),
      camera: true,
    },
    {
      id: "fit",
      label: "Recentrer le graphe",
      icon: Maximize,
      action: () => controls.current?.fit(),
      camera: true,
    },
    {
      id: "reset",
      label: "Réinitialiser le graphe",
      icon: RotateCcw,
      action: reset,
      camera: false,
    },
    {
      id: "fullscreen",
      label: fullscreen ? "Quitter le plein écran" : "Plein écran",
      icon: fullscreen ? Minimize : Expand,
      action: toggleFullscreen,
      camera: false,
    },
  ];
  return (
    <div
      className="atlas-graph-controls"
      role="group"
      aria-label="Contrôles du graphe"
    >
      {actions.map(({ id, label, icon: Icon, action, camera }) => (
        <Tooltip key={id}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={label}
              aria-pressed={id === "fullscreen" ? fullscreen : undefined}
              disabled={camera && disabled}
              onClick={action}
            >
              <Icon size={17} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
