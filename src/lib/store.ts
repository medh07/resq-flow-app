import { create } from "zustand";
import { persist } from "zustand/middleware";
import { makeSeed } from "./seed";
import { DEFAULT_WEIGHTS } from "./priority";
import { DEFAULT_DRIFT, type DriftParams } from "./drift";
import type {
  Dispatch, FloodConditions, InventoryItem, MissingCase, Observation, Org, PriorityWeights, Report,
  ReportStatus, RiskZone, Role, SearchRecord, Shelter, Task, Team, Update,
} from "./types";
import { REPORT_FLOW } from "./types";
import { normalizeRole } from "./roles";

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

interface State {
  user: { name: string; role: Role };
  reports: Report[];
  cases: MissingCase[];
  flood: FloodConditions;
  observations: Observation[];
  searches: SearchRecord[];
  teams: Team[];
  tasks: Task[];
  inventory: InventoryItem[];
  dispatches: Dispatch[];
  shelters: Shelter[];
  updates: Update[];
  orgs: Org[];
  zones: RiskZone[];
  weights: PriorityWeights;
  drift: DriftParams;
  myReportIds: string[];
  setRole: (r: Role) => void;
  setName: (n: string) => void;
  addReport: (r: Omit<Report, "id" | "createdAt" | "status" | "verified" | "equipment" | "history" | "simulated">) => string;
  advanceReport: (id: string) => void;
  verifyReport: (id: string) => void;
  assignTeam: (reportId: string, teamId: string) => void;
  setEquipment: (id: string, eq: string[]) => void;
  addCase: (c: Omit<MissingCase, "id" | "createdAt" | "status" | "simulated">) => string;
  setCaseStatus: (id: string, s: MissingCase["status"]) => void;
  addObservation: (o: Omit<Observation, "id">) => void;
  verifyObservation: (id: string) => void;
  addSearch: (s: Omit<SearchRecord, "id">) => void;
  setFlood: (f: Partial<FloodConditions>) => void;
  setWeights: (w: Partial<PriorityWeights>) => void;
  setDrift: (d: Partial<DriftParams>) => void;
  toggleTeam: (id: string) => void;
  createSearchTask: (caseId: string, sectorId: string, label: string, teamId: string) => void;
  acceptTask: (id: string) => void;
  progressTask: (id: string) => void;
  addTask: (t: Pick<Task, "title" | "kind" | "location" | "needs">) => void;
  dispatch: (d: Omit<Dispatch, "id" | "createdAt" | "status">) => string | null;
  advanceDispatch: (id: string) => void;
  restock: (itemId: string, qty: number) => void;
  updateShelter: (id: string, occupancy: number) => void;
  addOrg: (o: Omit<Org, "id" | "verified">) => void;
  verifyOrg: (id: string) => void;
  resetDemo: () => void;
}

const fresh = () => makeSeed(Date.now());

export const useApp = create<State>()(
  persist(
    (set, get) => ({
      user: { name: "Asha", role: "citizen" },
      ...fresh(),
      weights: DEFAULT_WEIGHTS,
      drift: DEFAULT_DRIFT,
      myReportIds: [],
      setRole: (role) => set((s) => ({ user: { ...s.user, role: normalizeRole(role) } })),
      setName: (name) => set((s) => ({ user: { ...s.user, name } })),
      addReport: (r) => {
        const id = `R-${1049 + get().reports.length}`;
        const now = Date.now();
        set((s) => ({
          reports: [{ ...r, id, createdAt: now, status: "reported", verified: false, equipment: [], history: [{ status: "reported", at: now }], simulated: false }, ...s.reports],
          myReportIds: [id, ...s.myReportIds],
        }));
        return id;
      },
      advanceReport: (id) =>
        set((s) => ({
          reports: s.reports.map((r) => {
            if (r.id !== id) return r;
            const i = REPORT_FLOW.indexOf(r.status);
            if (i >= REPORT_FLOW.length - 1) return r;
            const next = REPORT_FLOW[i + 1] as ReportStatus;
            return { ...r, status: next, verified: true, history: [...r.history, { status: next, at: Date.now() }] };
          }),
          teams: s.teams.map((t) => {
            const r = s.reports.find((x) => x.id === id);
            if (r && t.id === r.teamId && (r.status === "rescued")) return { ...t, available: true, assignment: undefined };
            return t;
          }),
        })),
      verifyReport: (id) =>
        set((s) => ({
          reports: s.reports.map((r) => (r.id === id && r.status === "reported" ? { ...r, verified: true, status: "verified", history: [...r.history, { status: "verified", at: Date.now() }] } : r)),
        })),
      assignTeam: (reportId, teamId) =>
        set((s) => ({
          reports: s.reports.map((r) =>
            r.id === reportId
              ? { ...r, teamId, verified: true, status: "assigned", history: [...r.history.filter((h) => h.status !== "assigned"), ...(r.status === "reported" ? [{ status: "verified" as const, at: Date.now() }] : []), { status: "assigned", at: Date.now() }] }
              : r,
          ),
          teams: s.teams.map((t) => (t.id === teamId ? { ...t, available: false, assignment: reportId } : t)),
        })),
      setEquipment: (id, equipment) => set((s) => ({ reports: s.reports.map((r) => (r.id === id ? { ...r, equipment } : r)) })),
      addCase: (c) => {
        const id = uid("MC");
        set((s) => ({ cases: [{ ...c, id, createdAt: Date.now(), status: "active", simulated: false }, ...s.cases] }));
        return id;
      },
      setCaseStatus: (id, status) => set((s) => ({ cases: s.cases.map((c) => (c.id === id ? { ...c, status } : c)) })),
      addObservation: (o) => set((s) => ({ observations: [{ ...o, id: uid("O") }, ...s.observations] })),
      verifyObservation: (id) => set((s) => ({ observations: s.observations.map((o) => (o.id === id ? { ...o, verified: true } : o)) })),
      addSearch: (r) =>
        set((s) => ({
          searches: [{ ...r, id: uid("SR") }, ...s.searches],
          teams: r.teamId ? s.teams.map((t) => (t.id === r.teamId ? { ...t, available: true, assignment: undefined } : t)) : s.teams,
          tasks: s.tasks.map((t) => (t.sectorId === r.sectorId && t.status !== "completed" ? { ...t, status: "completed", progress: 1 } : t)),
          cases: r.outcome === "found_person" ? s.cases.map((c) => (c.id === r.caseId ? { ...c, status: "found" } : c)) : s.cases,
        })),
      setFlood: (f) => set((s) => ({ flood: { ...s.flood, ...f } })),
      setWeights: (w) => set((s) => ({ weights: { ...s.weights, ...w } })),
      setDrift: (d) => set((s) => ({ drift: { ...s.drift, ...d } })),
      toggleTeam: (id) => set((s) => ({ teams: s.teams.map((t) => (t.id === id ? { ...t, available: !t.available, assignment: t.available ? t.assignment : undefined } : t)) })),
      createSearchTask: (caseId, sectorId, label, teamId) =>
        set((s) => {
          const team = s.teams.find((t) => t.id === teamId);
          return {
            tasks: [{ id: uid("TK"), title: `Search ${label}`, kind: "search", location: label, needs: [], status: "assigned", assignee: team?.name, caseId, sectorId, progress: 0.1, createdAt: Date.now() }, ...s.tasks],
            teams: s.teams.map((t) => (t.id === teamId ? { ...t, available: false, assignment: sectorId } : t)),
          };
        }),
      acceptTask: (id) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, status: "assigned", assignee: `${s.user.name} (you)`, progress: 0.1 } : t)) })),
      progressTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t;
            if (t.status === "assigned") return { ...t, status: "in_progress", progress: 0.5 };
            if (t.status === "in_progress") return { ...t, status: "completed", progress: 1 };
            return t;
          }),
        })),
      addTask: (t) => set((s) => ({ tasks: [{ ...t, id: uid("TK"), status: "open", progress: 0, createdAt: Date.now() }, ...s.tasks] })),
      dispatch: (d) => {
        const item = get().inventory.find((i) => i.id === d.itemId);
        if (!item || d.qty <= 0 || d.qty > item.qty) return "Quantity exceeds available stock";
        set((s) => ({
          inventory: s.inventory.map((i) => (i.id === d.itemId ? { ...i, qty: i.qty - d.qty } : i)),
          dispatches: [{ ...d, id: uid("D"), status: "packed", createdAt: Date.now() }, ...s.dispatches],
        }));
        return null;
      },
      advanceDispatch: (id) =>
        set((s) => ({ dispatches: s.dispatches.map((d) => (d.id === id ? { ...d, status: d.status === "packed" ? "in_transit" : "delivered" } : d)) })),
      restock: (itemId, qty) => set((s) => ({ inventory: s.inventory.map((i) => (i.id === itemId ? { ...i, qty: i.qty + qty } : i)) })),
      updateShelter: (id, occupancy) => set((s) => ({ shelters: s.shelters.map((x) => (x.id === id ? { ...x, occupancy, updatedAt: Date.now() } : x)) })),
      addOrg: (o) => set((s) => ({ orgs: [...s.orgs, { ...o, id: uid("OG"), verified: false }] })),
      verifyOrg: (id) => set((s) => ({ orgs: s.orgs.map((o) => (o.id === id ? { ...o, verified: true } : o)) })),
      resetDemo: () => set({ ...fresh(), weights: DEFAULT_WEIGHTS, drift: DEFAULT_DRIFT, myReportIds: [] }),
    }),
    {
      name: "resqflow-v1",
      skipHydration: true,
      merge: (persisted, current) => {
        const saved = persisted as Partial<State> | undefined;
        return {
          ...current,
          ...saved,
          user: { ...current.user, ...saved?.user, role: normalizeRole(saved?.user?.role ?? current.user.role) },
        };
      },
    },
  ),
);
