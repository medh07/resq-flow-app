import { beforeEach, describe, expect, it } from "vitest";
import { AVAILABLE_ROLES, canManageResources, canPlanSearch, normalizeRole } from "@/lib/roles";
import { useApp } from "@/lib/store";

describe("Emergency-first roles", () => {
  beforeEach(() => {
    localStorage.clear();
    useApp.getState().resetDemo();
    useApp.getState().setRole("citizen");
  });

  it("offers only citizen, volunteer and resource/shelter manager roles", () => {
    expect(AVAILABLE_ROLES).toEqual(["citizen", "volunteer", "manager"]);
  });

  it("normalizes the retired coordinator role to citizen", () => {
    expect(normalizeRole("coordinator")).toBe("citizen");
  });

  it("migrates an existing coordinator profile without discarding reports", async () => {
    const current = useApp.getState();
    localStorage.setItem("resqflow-v1", JSON.stringify({ state: { user: { name: "Existing user", role: "coordinator" }, reports: current.reports, myReportIds: [current.reports[0]?.id] }, version: 0 }));
    await useApp.persist.rehydrate();
    expect(useApp.getState().user).toEqual({ name: "Existing user", role: "citizen" });
    expect(useApp.getState().reports).toEqual(current.reports);
    expect(useApp.getState().myReportIds).toEqual([current.reports[0]?.id]);
  });

  it("preserves volunteer search planning without granting resource management", () => {
    expect(canPlanSearch("volunteer")).toBe(true);
    expect(canPlanSearch("citizen")).toBe(false);
    expect(canPlanSearch("manager")).toBe(false);
    expect(canManageResources("volunteer")).toBe(false);
  });

  it("preserves resource and shelter manager capabilities", () => {
    expect(canManageResources("manager")).toBe(true);
    expect(canManageResources("citizen")).toBe(false);
  });

  it("saves emergency details and makes the report trackable without simulating notification", () => {
    const details = { category: "rescue" as const, severity: "critical" as const, lifeThreatening: true, people: 3, description: "Three people trapped by floodwater", lat: 26.18, lng: 91.74, place: "Last-known riverbank", anonymous: false, contactName: "Reporter", contactPhone: "9876543210" };
    const id = useApp.getState().addReport(details);
    expect(useApp.getState().myReportIds).toContain(id);
    expect(useApp.getState().reports.find((report) => report.id === id)).toMatchObject({ ...details, status: "reported", verified: false, history: [{ status: "reported", at: expect.any(Number) }] });
  });

  it("preserves missing-person last-seen details and optional report evidence", () => {
    const lastSeenAt = Date.UTC(2026, 9, 28, 12);
    const id = useApp.getState().addCase({ name: "Missing person", description: "Red jacket, blue backpack", lastLat: 26.18, lastLng: 91.74, lastPlace: "Riverbank", lastSeenAt });
    expect(useApp.getState().cases.find((item) => item.id === id)).toMatchObject({ description: "Red jacket, blue backpack", lastLat: 26.18, lastLng: 91.74, lastPlace: "Riverbank", lastSeenAt, status: "active" });
    const reportId = useApp.getState().addReport({ category: "missing", severity: "high", lifeThreatening: false, people: 1, description: "Missing since yesterday", lat: 26.18, lng: 91.74, place: "Riverbank", anonymous: true, image: "data:image/png;base64,evidence" });
    expect(useApp.getState().reports.find((report) => report.id === reportId)?.image).toBe("data:image/png;base64,evidence");
  });
});