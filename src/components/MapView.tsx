import { lazy, Suspense, useEffect, useState } from "react";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  color: string;
  label?: string;
  size?: number;
  onClick?: () => void;
}
export interface MapShape {
  id: string;
  kind: "polygon" | "circle" | "line";
  points?: [number, number][];
  center?: [number, number];
  radius?: number;
  color: string;
  fillOpacity?: number;
  dashed?: boolean;
  label?: string;
  onClick?: () => void;
}
export interface MapViewProps {
  center: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  shapes?: MapShape[];
  className?: string;
  onPick?: (lat: number, lng: number) => void;
}

const Inner = lazy(() => import("./MapInner"));

export function MapView(props: MapViewProps) {
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(true), []);
  const fallback = <div className={`${props.className ?? "h-72"} animate-pulse rounded-2xl bg-muted`} />;
  if (!ok) return fallback;
  return (
    <Suspense fallback={fallback}>
      <Inner {...props} />
    </Suspense>
  );
}
