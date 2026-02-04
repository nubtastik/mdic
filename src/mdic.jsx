import React, { useMemo, useState } from "react";

const DECISIONS = [
  { id: "overtime", label: "Add Overtime" },
  { id: "temp", label: "Add Temp Labor" },
  { id: "headcount", label: "Reduce Headcount" },
  { id: "deferpm", label: "Defer Preventive Maintenance" },
  { id: "rate", label: "Increase Production Rate" },
  { id: "capex", label: "Delay CAPEX Purchase" },
];

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "$0";
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default function MDIC() {
  const [decision, setDecision] = useState("overtime");

  // Common inputs (manager-friendly)
  const [horizonWeeks, setHorizonWeeks] = useState(6);
  const [runtimePerWeek, setRuntimePerWeek] = useState(40);
  const [baselineUnitsPerHr, setBaselineUnitsPerHr] = useState(50);
  const [laborRate, setLaborRate] = useState(35);
  const [sellPrice, setSellPrice] = useState(0);
  const [cmPct, setCmPct] = useState(35);
  const [overheadPct, setOverheadPct] = useState(0);

  // Overtime inputs (first mode)
  const [otHours, setOtHours] = useState(10);
  const [otPremium, setOtPremium] = useState(1.5);
  const [fatiguePerfDeltaPct, setFatiguePerfDeltaPct] = useState(-3); // % change
  const [fatigueScrapDeltaPp, setFatigueScrapDeltaPp] = useState(0.5); // pp
  const [fatigueDowntimeDeltaHr, setFatigueDowntimeDeltaHr] = useState(0.2); // hr/wk

  const baseline = useMemo(() => {
    const units = num(baselineUnitsPerHr) * num(runtimePerWeek);
    const goodUnitsPerHr = num(baselineUnitsPerHr); // proxy
    const cm = num(cmPct) / 100;
    const oppCostPerHr = goodUnitsPerHr * num(sellPrice) * cm;
    return { units, goodUnitsPerHr, cm, oppCostPerHr };
  }, [baselineUnitsPerHr, runtimePerWeek, sellPrice, cmPct]);

  const overtimeCalc = useMemo(() => {
    // Costs
    const oh = 1 + num(overheadPct) / 100;
    const otLaborCost = num(otHours) * num(laborRate) * num(otPremium) * oh;

    // Impacts
    const perfDeltaUnits = baseline.units * (num(fatiguePerfDeltaPct) / 100);
    const scrapDeltaUnits = baseline.units * (num(fatigueScrapDeltaPp) / 100);
    const downtimeDeltaUnits = num(fatigueDowntimeDeltaHr) * num(baselineUnitsPerHr);

    // Net good units delta (simple directional model)
    const deltaGoodUnits = perfDeltaUnits - scrapDeltaUnits - downtimeDeltaUnits;

    // Profit impact if pricing is available, otherwise show cost-only
    const profitFromUnits =
      num(sellPrice) > 0
        ? deltaGoodUnits * num(sellPrice) * baseline.cm
        : 0;

    const netImpactPerWeek = profitFromUnits - otLaborCost;
    const totalImpact = netImpactPerWeek * num(horizonWeeks);

    return {
      otLaborCost,
      perfDeltaUnits,
      scrapDeltaUnits,
      downtimeDeltaUnits,
      deltaGoodUnits,
      profitFromUnits,
      netImpactPerWeek,
      totalImpact,
    };
  }, [
    baseline.units,
    baseline.cm,
    baselineUnitsPerHr,
    sellPrice,
    overheadPct,
    otHours,
    laborRate,
    otPremium,
    fatiguePerfDeltaPct,
    fatigueScrapDeltaPp,
    fatigueDowntimeDeltaHr,
    horizonWeeks,
  ]);

  const active = useMemo(() => {
    if (decision === "overtime") return overtimeCalc;
    return null;
  }, [decision, overtimeCalc]);

  const isReady =
    num(horizonWeeks) > 0 &&
    num(runtimePerWeek) > 0 &&
    num(baselineUnitsPerHr) > 0 &&
    num(laborRate) > 0;

  return (
    <div style={{ fontFamily: "system-ui, Segoe UI, Arial", padding: 18, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ margin: 0 }}>MDIC — Manufacturing Decision Impact Calculator</h1>
      <p style={{ marginTop: 6, color: "#444" }}>
        Quantify the weekly + total business impact of common plant decisions (cost, throughput, and risk).
      </p>

      {/* Decision Type */}
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr", marginTop: 14 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
          <label style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>Decision type</label>
          <select
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          >
            {DECISIONS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
          <div style={{ marginTop: 8, fontSize: 12, color: "#555" }}>
            Start with estimates. This tool is designed to be directionally correct and easy to explain to leadership.
          </div>
        </div>

        {/* Common Inputs */}
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Common inputs</h2>

          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <Field label="Time horizon (weeks)" value={horizonWeeks} setValue={setHorizonWeeks} />
            <Field label="Planned runtime per week (hrs)" value={runtimePerWeek} setValue={setRuntimePerWeek} />
            <Field label="Baseline output rate (units/hr)" value={baselineUnitsPerHr} setValue={setBaselineUnitsPerHr} />
            <Field label="Fully burdened labor cost ($/hr)" value={laborRate} setValue={setLaborRate} />
            <Field label="Overhead add-on (%)" value={overheadPct} setValue={setOverheadPct} />
            <Field label="Selling price ($/unit, optional)" value={sellPrice} setValue={setSellPrice} />
            <Field label="Contribution margin (%)" value={cmPct} setValue={setCmPct} />
          </div>

          {!isReady && (
            <div style={{ marginTop: 10, color: "#b00020", fontSize: 13 }}>
              Please enter: horizon, runtime/week, baseline units/hr, and labor $/hr.
            </div>
          )}
        </div>

        {/* Decision-specific */}
        {decision === "overtime" && (
          <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Overtime inputs</h2>

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <Field label="Overtime hours per week" value={otHours} setValue={setOtHours} />
              <Field label="OT premium (multiplier)" value={otPremium} setValue={setOtPremium} step="0.1" />
              <Field label="Fatigue productivity delta (%)" value={fatiguePerfDeltaPct} setValue={setFatiguePerfDeltaPct} step="0.5" />
              <Field label="Fatigue scrap delta (pp)" value={fatigueScrapDeltaPp} setValue={setFatigueScrapDeltaPp} step="0.1" />
              <Field label="Fatigue downtime delta (hr/wk)" value={fatigueDowntimeDeltaHr} setValue={setFatigueDowntimeDeltaHr} step="0.1" />
            </div>

            <div style={{ marginTop: 10, fontSize: 12, color: "#555" }}>
              Tip: If you don’t have good estimates, leave the fatigue deltas at 0 to view pure labor cost impact.
            </div>
          </div>
        )}

        {/* Results */}
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Results</h2>

          {!isReady || !active ? (
            <div style={{ color: "#555" }}>Enter required inputs to see results.</div>
          ) : (
            <>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
                <KPI title="Net impact / week" value={money(active.netImpactPerWeek)} />
                <KPI title="Total impact (horizon)" value={money(active.totalImpact)} />
                <KPI title="OT labor cost / week" value={money(active.otLaborCost)} />
                <KPI title="Δ Good units / week" value={Math.round(active.deltaGoodUnits).toLocaleString()} />
              </div>

              <div style={{ marginTop: 12 }}>
                <h3 style={{ marginBottom: 8, fontSize: 15 }}>Breakdown (Overtime)</h3>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <Row label="Performance delta (units)" value={Math.round(active.perfDeltaUnits).toLocaleString()} />
                    <Row label="Scrap delta (units)" value={Math.round(active.scrapDeltaUnits).toLocaleString()} />
                    <Row label="Downtime delta (units)" value={Math.round(active.downtimeDeltaUnits).toLocaleString()} />
                    <Row label="Profit from unit delta (if price provided)" value={money(active.profitFromUnits)} />
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 12, padding: 10, background: "#f7f7f7", borderRadius: 10 }}>
                <strong>Decision summary:</strong>{" "}
                {active.netImpactPerWeek >= 0
                  ? `This decision is estimated to improve results by ${money(active.netImpactPerWeek)} per week.`
                  : `This decision is estimated to cost ${money(Math.abs(active.netImpactPerWeek))} per week.`}
              </div>
            </>
          )}
        </div>
      </div>

      <p style={{ marginTop: 16, fontSize: 12, color: "#666" }}>
        MfgCalc — A calculated approach to manufacturing.
      </p>
    </div>
  );
}

function Field({ label, value, setValue, step = "1" }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, color: "#333", marginBottom: 4 }}>{label}</label>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => setValue(e.target.value)}
        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
      />
    </div>
  );
}

function KPI({ title, value }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 12, color: "#555" }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <tr>
      <td style={{ padding: "8px 6px", borderBottom: "1px solid #eee", color: "#333" }}>{label}</td>
      <td style={{ padding: "8px 6px", borderBottom: "1px solid #eee", textAlign: "right", fontWeight: 600 }}>
        {value}
      </td>
    </tr>
  );
}
