import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapViewProps } from "./MapView";

function resolve(c: string) {
  if (!c.startsWith("var(")) return c;
  const name = c.slice(4, -1);
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#3b82f6";
}

export default function MapInner({ center, zoom = 13, markers = [], shapes = [], className, onPick }: MapViewProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { zoomControl: true, attributionControl: true }).setView(center, zoom);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    m.on("click", (e) => pickRef.current?.(e.latlng.lat, e.latlng.lng));
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    map.current?.setView(center, map.current.getZoom());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1]]);

  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    for (const s of shapes) {
      const color = resolve(s.color);
      const style = { color, weight: s.kind === "line" ? 3 : 1.5, fillOpacity: s.fillOpacity ?? 0.2, dashArray: s.dashed ? "6 6" : undefined };
      let l: L.Layer | null = null;
      if (s.kind === "polygon" && s.points) l = L.polygon(s.points, style);
      if (s.kind === "line" && s.points) l = L.polyline(s.points, style);
      if (s.kind === "circle" && s.center) l = L.circle(s.center, { ...style, radius: s.radius ?? 500 });
      if (!l) continue;
      if (s.label) (l as L.Path).bindTooltip(s.label, { sticky: true });
      if (s.onClick) l.on("click", (e) => { L.DomEvent.stopPropagation(e); s.onClick!(); });
      g.addLayer(l);
    }
    for (const mk of markers) {
      const color = resolve(mk.color);
      const c = L.circleMarker([mk.lat, mk.lng], { radius: mk.size ?? 9, color: "#fff", weight: 2, fillColor: color, fillOpacity: 1 });
      if (mk.label) c.bindTooltip(mk.label);
      if (mk.onClick) c.on("click", (e) => { L.DomEvent.stopPropagation(e); mk.onClick!(); });
      g.addLayer(c);
    }
  }, [markers, shapes]);

  return <div ref={el} className={`${className ?? "h-72"} z-0 overflow-hidden rounded-2xl`} />;
}
