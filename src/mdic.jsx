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
  <div className="mdic-wrap">
    <h1 className="mdic-title">MDIC — Manufacturing Decision Impact Calculator</h1>
    <p className="mdic-subtitle">
      Quantify the weekly + total business impact of common plant decisions (cost, throughput, and risk).
    </p>

    <div className="mdic-grid">
      <div className="mdic-card">
        <label className="mdic-label">Decision type</label>
        <select
          className="mdic-select"
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
        >
          {DECISIONS.map((d) => (
            <option key={d.id} value={d.id}>{d.label}</option>
          ))}
        </select>
        <div className="mdic-help">
          Start with estimates. This tool is designed to be directionally correct and easy to explain to leadership.
        </div>
      </div>

      <div className="mdic-card">
        <h2>Common inputs</h2>
        <div className="mdic-fields">
          <Field label="Time horizon (weeks)" value={horizonWeeks} setValue={setHorizonWeeks} />
          <Field label="Planned runtime per week (hrs)" value={runtimePerWeek} setValue={setRuntimePerWeek} />
          <Field label="Baseline output rate (units/hr)" value={baselineUnitsPerHr} setValue={setBaselineUnitsPerHr} />
          <Field label="Fully burdened labor cost ($/hr)" value={laborRate} setValue={setLaborRate} />
          <Field label="Overhead add-on (%)" value={overheadPct} setValue={setOverheadPct} />
          <Field label="Selling price ($/unit, optional)" value={sellPrice} setValue={setSellPrice} />
          <Field label="Contribution margin (%)" value={cmPct} setValue={setCmPct} />
        </div>

        {!isReady && (
          <div className="mdic-error">
            Please enter: horizon, runtime/week, baseline units/hr, and labor $/hr.
          </div>
        )}
      </div>

      {decision === "overtime" && (
        <div className="mdic-card">
          <h2>Overtime inputs</h2>
          <div className="mdic-fields">
            <Field label="Overtime hours per week" value={otHours} setValue={setOtHours} />
            <Field label="OT premium (multiplier)" value={otPremium} setValue={setOtPremium} step="0.1" />
            <Field label="Fatigue productivity delta (%)" value={fatiguePerfDeltaPct} setValue={setFatiguePerfDeltaPct} step="0.5" />
            <Field label="Fatigue scrap delta (pp)" value={fatigueScrapDeltaPp} setValue={setFatigueScrapDeltaPp} step="0.1" />
            <Field label="Fatigue downtime delta (hr/wk)" value={fatigueDowntimeDeltaHr} setValue={setFatigueDowntimeDeltaHr} step="0.1" />
          </div>
          <div className="mdic-help">
            Tip: If you don’t have good estimates, set fatigue deltas to 0 to view pure labor cost impact.
          </div>
        </div>
      )}

      <div className="mdic-card">
        <h2>Results</h2>

        {!isReady || !active ? (
          <div className="mdic-help">Enter required inputs to see results.</div>
        ) : (
          <>
            <div className="mdic-kpis">
              <KPI title="Net impact / week" value={money(active.netImpactPerWeek)} />
              <KPI title="Total impact (horizon)" value={money(active.totalImpact)} />
              <KPI title="OT labor cost / week" value={money(active.otLaborCost)} />
              <KPI title="Δ Good units / week" value={Math.round(active.deltaGoodUnits).toLocaleString()} />
            </div>

            <div className="mdic-summary">
              <strong>Decision summary:</strong>{" "}
              {active.netImpactPerWeek >= 0
                ? `This decision is estimated to improve results by ${money(active.netImpactPerWeek)} per week.`
                : `This decision is estimated to cost ${money(Math.abs(active.netImpactPerWeek))} per week.`}
            </div>
          </>
        )}
      </div>
    </div>

    <p className="mdic-help" style={{ marginTop: 16 }}>
      MfgCalc — A calculated approach to manufacturing.
    </p>
  </div>
);

}

function Field({ label, value, setValue, step = "1" }) {
  const id = React.useId();

  return (
    <div>
      <label className="mdic-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        className="mdic-input"
        type="number"
        value={value}
        step={step}
        onChange={(e) => {
          // Keep as number when possible, allow empty while typing
          const v = e.target.value;
          setValue(v === "" ? "" : Number(v));
        }}
        onWheel={(e) => {
          // Prevent mouse wheel from changing number inputs while scrolling
          e.currentTarget.blur();
        }}
      />
    </div>
  );
}


function KPI({ title, value }) {
  return (
    <div className="mdic-kpi">
      <div className="kpi-title">{title}</div>
      <div className="kpi-value">{value}</div>
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
