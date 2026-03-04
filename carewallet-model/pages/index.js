import { useState, useMemo } from "react";

const FX = 18.2; // USD to ZAR approx

function fmt(n) {
  if (Math.abs(n) >= 1_000_000) return `R${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `R${(n / 1_000).toFixed(0)}K`;
  return `R${Math.round(n).toLocaleString()}`;
}
function fmtFull(n) { return `R ${Math.round(n).toLocaleString()}`; }
function fmtNum(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
function pct(n) { return `${(n * 100).toFixed(1)}%`; }

function Slider({ label, value, onChange, min, max, step, prefix = "", suffix = "", note }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
        <span style={{ fontSize: 12, color: "#a1a1aa", fontFamily: "var(--sans)" }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#fafafa", fontFamily: "var(--mono)" }}>
          {prefix}{typeof value === "number" && value >= 1000 ? value.toLocaleString() : value}{suffix}
        </span>
      </div>
      {note && <div style={{ fontSize: 10, color: "#71717a", marginBottom: 5, lineHeight: 1.4 }}>{note}</div>}
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#10b981", height: 3, cursor: "pointer" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#52525b" }}>
        <span>{prefix}{min.toLocaleString()}{suffix}</span>
        <span>{prefix}{max.toLocaleString()}{suffix}</span>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, color = "#10b981", size = "normal" }) {
  return (
    <div style={{
      background: "#18181b",
      border: "1px solid #27272a",
      borderRadius: 8,
      padding: size === "large" ? "16px 14px" : "12px 10px",
      flex: 1,
      minWidth: size === "large" ? 155 : 120,
    }}>
      <div style={{ fontSize: 10, color: "#71717a", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5, fontFamily: "var(--sans)" }}>{label}</div>
      <div style={{ fontSize: size === "large" ? 24 : 18, fontWeight: 800, color, fontFamily: "var(--mono)", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "#52525b", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function Block({ title, accent = "#10b981", children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ width: 3, height: 18, background: accent, borderRadius: 2 }} />
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#e4e4e7", fontFamily: "var(--sans)", letterSpacing: 0.3 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function CarewalletClinicModel() {
  // Clinic chain facts
  const [monthlyConsults, setMonthlyConsults] = useState(95000);
  const clinicCount = 225;
  const totalHistoricConsults = 3_000_000;

  // Pricing
  const [cashPrice, setCashPrice] = useState(520);
  const [voucherPrice, setVoucherPrice] = useState(380);
  const [gpPayoutRate, setGpPayoutRate] = useState(290);
  const platformFeePct = 10;

  // Adoption
  const [adoptionPct, setAdoptionPct] = useState(15);
  const [vouchersPerUserMonth, setVouchersPerUserMonth] = useState(1);
  const [monthlyAdoptionGrowth, setMonthlyAdoptionGrowth] = useState(3);

  // Carewallet costs (lean)
  const infraCostUSD = 100;
  const salaryCEO_USD = 1500;
  const salaryCTO_USD = 1500;
  const totalMonthlyCostZAR = (infraCostUSD + salaryCEO_USD + salaryCTO_USD) * FX;

  const [tab, setTab] = useState("case");

  const m = useMemo(() => {
    // Unit economics
    const consumerDiscount = cashPrice - voucherPrice;
    const consumerDiscountPct = consumerDiscount / cashPrice;
    const platformFee = gpPayoutRate * (platformFeePct / 100);
    const spread = voucherPrice - gpPayoutRate;
    const totalRevPerVoucher = spread + platformFee;
    const paymentProcessing = voucherPrice * 0.025;
    const netRevPerVoucher = totalRevPerVoucher - paymentProcessing;

    // Clinic economics
    const clinicRevenuePerConsultCash = cashPrice;
    const clinicRevenuePerConsultVoucher = gpPayoutRate - platformFee;
    const clinicNetLossPerVoucher = clinicRevenuePerConsultCash - clinicRevenuePerConsultVoucher;

    // Volume
    const voucherUsers = Math.round(monthlyConsults * (adoptionPct / 100));
    const monthlyVouchersSold = voucherUsers * vouchersPerUserMonth;
    const remainingCashConsults = monthlyConsults - monthlyVouchersSold;

    // Carewallet P&L
    const monthlyGMV = monthlyVouchersSold * voucherPrice;
    const monthlyGrossRev = monthlyVouchersSold * totalRevPerVoucher;
    const monthlyNetRev = monthlyVouchersSold * netRevPerVoucher;
    const monthlyProfit = monthlyNetRev - totalMonthlyCostZAR;

    // Clinic value analysis — the argument for the clinic
    // Current: all cash, but variable. Some patients don't return. Churn is high.
    // With Carewallet: slightly less per voucher consult, BUT more repeat visits + new patients
    const currentMonthlyRevenue = monthlyConsults * cashPrice;
    const avgConsultsPerClinic = monthlyConsults / clinicCount;

    // 12-month projection
    const months = [];
    let adoptPct = adoptionPct;
    let cumCWProfit = 0;
    let breakEvenMonth = null;

    for (let i = 1; i <= 12; i++) {
      if (i > 1) adoptPct = Math.min(adoptPct + monthlyAdoptionGrowth, 60);
      const vUsers = Math.round(monthlyConsults * (adoptPct / 100));
      const vSold = vUsers * vouchersPerUserMonth;
      const cashConsults = monthlyConsults - vSold;

      // NEW patients attracted by voucher affordability (growth lever)
      const newPatientsFromVoucher = Math.round(vSold * 0.12 * (i / 6)); // 12% of voucher users are net-new, growing
      const totalConsultsWithGrowth = monthlyConsults + newPatientsFromVoucher;
      
      // Clinic revenue
      const clinicCashRev = cashConsults * cashPrice;
      const clinicVoucherRev = vSold * (gpPayoutRate - platformFee);
      const clinicNewPatientRev = newPatientsFromVoucher * (gpPayoutRate - platformFee);
      const clinicTotalRev = clinicCashRev + clinicVoucherRev + clinicNewPatientRev;
      const clinicBaselineRev = monthlyConsults * cashPrice;

      // Repeat visit uplift: voucher patients visit more frequently
      const repeatUplift = Math.round(vSold * 0.08); // 8% additional visits from voucher holders
      const clinicRepeatRev = repeatUplift * (gpPayoutRate - platformFee);
      const clinicTotalWithRepeat = clinicTotalRev + clinicRepeatRev;

      // Carewallet
      const cwRev = (vSold + newPatientsFromVoucher + repeatUplift) * netRevPerVoucher;
      const cwProfit = cwRev - totalMonthlyCostZAR;
      cumCWProfit += cwProfit;
      if (cwProfit > 0 && !breakEvenMonth) breakEvenMonth = i;

      months.push({
        month: i,
        adoptPct,
        voucherUsers: vUsers,
        vouchersSold: vSold,
        newPatients: newPatientsFromVoucher,
        repeatUplift,
        totalConsults: totalConsultsWithGrowth + repeatUplift,
        clinicBaseline: clinicBaselineRev,
        clinicActual: clinicTotalWithRepeat,
        clinicDelta: clinicTotalWithRepeat - clinicBaselineRev,
        cwRevenue: cwRev,
        cwProfit,
        cumCWProfit,
      });
    }

    return {
      consumerDiscount,
      consumerDiscountPct,
      platformFee,
      spread,
      totalRevPerVoucher,
      paymentProcessing,
      netRevPerVoucher,
      clinicRevenuePerConsultVoucher,
      voucherUsers,
      monthlyVouchersSold,
      monthlyGMV,
      monthlyGrossRev,
      monthlyNetRev,
      monthlyProfit,
      currentMonthlyRevenue,
      avgConsultsPerClinic,
      totalMonthlyCostZAR,
      months,
      breakEvenMonth,
      year1CWRevenue: months.reduce((s, x) => s + x.cwRevenue, 0),
      year1CWProfit: months[11]?.cumCWProfit || 0,
      year1ClinicUplift: months.reduce((s, x) => s + x.clinicDelta, 0),
      month12ClinicDelta: months[11]?.clinicDelta || 0,
      month12ClinicPct: months[11] ? months[11].clinicActual / months[11].clinicBaseline - 1 : 0,
    };
  }, [cashPrice, voucherPrice, gpPayoutRate, monthlyConsults, adoptionPct, vouchersPerUserMonth, monthlyAdoptionGrowth]);

  const tabs = [
    { id: "case", label: "1. Voucher Pricing" },
    { id: "volume", label: "2. Users & Frequency" },
    { id: "clinic", label: "3. Clinic P&L Impact" },
    { id: "projection", label: "4. 12-Month Comparison" },
    { id: "pitch", label: "5. Pitch Summary" },
  ];

  // Chart helpers
  const maxClinicRev = Math.max(...m.months.map(x => Math.max(x.clinicBaseline, x.clinicActual)));

  return (
    <div style={{
      "--sans": "'Geist', 'Inter', -apple-system, sans-serif",
      "--mono": "'Geist Mono', 'JetBrains Mono', monospace",
      minHeight: "100vh",
      background: "#09090b",
      color: "#e4e4e7",
      fontFamily: "var(--sans)",
      padding: "16px",
    }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #27272a", paddingBottom: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2.5, color: "#10b981", textTransform: "uppercase", marginBottom: 4 }}>Business Case</div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#fafafa", letterSpacing: -0.5 }}>Carewallet × Clinic Chain</h1>
            <div style={{ fontSize: 12, color: "#52525b", marginTop: 3 }}>225 clinics · {fmtNum(monthlyConsults)} consultations/mo · 3M+ historic records</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#52525b" }}>Carewallet Monthly Burn</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fafafa", fontFamily: "var(--mono)" }}>{fmtFull(m.totalMonthlyCostZAR)}</div>
            <div style={{ fontSize: 9, color: "#3f3f46" }}>$3,100 × R{FX} | 2 founders + infra</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 3, marginBottom: 20, overflowX: "auto", paddingBottom: 2 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "7px 14px", borderRadius: 5,
            border: tab === t.id ? "1px solid #10b981" : "1px solid #27272a",
            background: tab === t.id ? "rgba(16,185,129,0.1)" : "transparent",
            color: tab === t.id ? "#10b981" : "#71717a",
            fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
            fontFamily: "var(--sans)",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Top KPIs always visible */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        <Stat label="Consumer Saves" value={pct(m.consumerDiscountPct)} sub={`${fmtFull(m.consumerDiscount)} off R${cashPrice} cash`} color={m.consumerDiscountPct >= 0.20 ? "#10b981" : m.consumerDiscountPct >= 0.15 ? "#f59e0b" : "#ef4444"} size="large" />
        <Stat label="Carewallet Net / Voucher" value={fmtFull(m.netRevPerVoucher)} sub={`${pct(m.netRevPerVoucher / voucherPrice)} effective take`} color={m.netRevPerVoucher > 0 ? "#10b981" : "#ef4444"} size="large" />
        <Stat label="Carewallet Monthly Profit" value={fmt(m.monthlyProfit)} sub={`on ${fmtNum(m.monthlyVouchersSold)} vouchers`} color={m.monthlyProfit > 0 ? "#10b981" : "#ef4444"} size="large" />
        <Stat label="Break-even" value={m.breakEvenMonth ? `Month ${m.breakEvenMonth}` : "—"} sub={m.breakEvenMonth ? "from launch" : "Adjust levers"} color={m.breakEvenMonth && m.breakEvenMonth <= 3 ? "#10b981" : "#f59e0b"} size="large" />
      </div>

      {/* TAB 1: VOUCHER PRICING */}
      {tab === "case" && (
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
          <div>
            <Block title="PRICING CONTROLS">
              <Slider label="Cash Walk-in Price" value={cashPrice} onChange={setCashPrice} min={350} max={650} step={10} prefix="R" note="What patients currently pay at this clinic chain" />
              <Slider label="Voucher Price (consumer pays)" value={voucherPrice} onChange={setVoucherPrice} min={200} max={500} step={10} prefix="R" note="Must be attractive enough to change behavior" />
              <Slider label="GP Payout (clinic receives)" value={gpPayoutRate} onChange={setGpPayoutRate} min={150} max={450} step={10} prefix="R" note="What Carewallet remits to the clinic per redemption" />
            </Block>
            <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#71717a", marginBottom: 10 }}>Platform fee to clinic</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#f59e0b", fontFamily: "var(--mono)" }}>10%</div>
              <div style={{ fontSize: 11, color: "#52525b" }}>of GP payout rate = {fmtFull(m.platformFee)}/voucher</div>
              <div style={{ fontSize: 10, color: "#3f3f46", marginTop: 6 }}>Charged to clinic for CRM, retainership tools, patient data analytics, and booking infrastructure</div>
            </div>
          </div>

          <div>
            <Block title="HOW THE MONEY FLOWS (per voucher)">
              <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: 16 }}>
                {/* Flow diagram */}
                <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 24 }}>
                  {[
                    { label: "Patient pays", amount: voucherPrice, color: "#3b82f6", width: 100 },
                    { label: "→", amount: null, color: "#52525b", width: 20 },
                    { label: "Clinic gets", amount: gpPayoutRate - m.platformFee, color: "#10b981", width: 100 },
                    { label: "+", amount: null, color: "#52525b", width: 15 },
                    { label: "Carewallet keeps", amount: m.netRevPerVoucher, color: "#f59e0b", width: 100 },
                  ].map((s, i) => (
                    <div key={i} style={{ flex: s.width ? `0 0 ${s.width}px` : "0 0 auto", textAlign: "center" }}>
                      {s.amount !== null ? (
                        <>
                          <div style={{ fontSize: 10, color: "#71717a", marginBottom: 3 }}>{s.label}</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: "var(--mono)" }}>{fmtFull(s.amount)}</div>
                        </>
                      ) : (
                        <div style={{ fontSize: 18, color: s.color, fontWeight: 300 }}>{s.label}</div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Breakdown bars */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "#71717a", marginBottom: 8 }}>Breakdown per {fmtFull(voucherPrice)} voucher</div>
                  {[
                    { label: "Clinic net receipt", value: gpPayoutRate - m.platformFee, color: "#10b981" },
                    { label: "Platform fee (10%)", value: m.platformFee, color: "#f59e0b" },
                    { label: "Spread (voucher − GP rate)", value: m.spread, color: "#3b82f6" },
                    { label: "Payment processing (2.5%)", value: -m.paymentProcessing, color: "#ef4444" },
                    { label: "Carewallet net revenue", value: m.netRevPerVoucher, color: "#10b981" },
                  ].map((row, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                      <div style={{ width: 150, fontSize: 11, color: "#a1a1aa", textAlign: "right" }}>{row.label}</div>
                      <div style={{ flex: 1, background: "#27272a", borderRadius: 3, height: 18, overflow: "hidden" }}>
                        <div style={{
                          width: `${Math.max(0, (Math.abs(row.value) / voucherPrice) * 100)}%`,
                          height: "100%",
                          background: row.color,
                          borderRadius: 3,
                          opacity: 0.8,
                        }} />
                      </div>
                      <div style={{ width: 60, fontSize: 12, fontWeight: 700, color: row.value >= 0 ? row.color : "#ef4444", fontFamily: "var(--mono)", textAlign: "right" }}>
                        {row.value >= 0 ? fmtFull(row.value) : `(${fmtFull(Math.abs(row.value))})`}
                      </div>
                    </div>
                  ))}
                </div>

                {/* vs cash comparison */}
                <div style={{ borderTop: "1px solid #27272a", paddingTop: 12 }}>
                  <div style={{ fontSize: 11, color: "#71717a", marginBottom: 8 }}>Patient comparison: Cash vs Voucher</div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ flex: 1, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, padding: 10, textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "#ef4444" }}>CASH WALK-IN</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#ef4444", fontFamily: "var(--mono)" }}>R{cashPrice}</div>
                      <div style={{ fontSize: 10, color: "#71717a" }}>Unpredictable, no records</div>
                    </div>
                    <div style={{ flex: 1, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 6, padding: 10, textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "#10b981" }}>CAREWALLET VOUCHER</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#10b981", fontFamily: "var(--mono)" }}>R{voucherPrice}</div>
                      <div style={{ fontSize: 10, color: "#71717a" }}>Save {fmtFull(m.consumerDiscount)} ({pct(m.consumerDiscountPct)})</div>
                    </div>
                  </div>
                </div>
              </div>
            </Block>

            <Block title="PRICE SENSITIVITY — WHAT THE MARKET TELLS US" accent="#3b82f6">
              <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 11, color: "#a1a1aa", lineHeight: 1.6, marginBottom: 12 }}>
                  Discovery Prepaid Health proved the model at <strong style={{ color: "#3b82f6" }}>R300</strong> (incl. meds) vs ~R450-520 cash = 33-42% discount.
                  Unu Health sells online consults from <strong style={{ color: "#a855f7" }}>R189</strong>.
                  The proven behavioral tipping point is <strong style={{ color: "#10b981" }}>20%+ discount</strong>.
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[
                    { d: 15, label: "Weak", color: "#ef4444" },
                    { d: 20, label: "Threshold", color: "#f59e0b" },
                    { d: 27, label: "Good", color: "#10b981" },
                    { d: 33, label: "Discovery", color: "#3b82f6" },
                    { d: 42, label: "Strong", color: "#a855f7" },
                  ].map((s, i) => {
                    const price = Math.round(cashPrice * (1 - s.d / 100));
                    const isActive = Math.abs(((cashPrice - voucherPrice) / cashPrice) * 100 - s.d) < 5;
                    return (
                      <div key={i} style={{
                        flex: 1, textAlign: "center", padding: "8px 4px", borderRadius: 6,
                        background: isActive ? `${s.color}15` : "#0c0c0e",
                        border: isActive ? `2px solid ${s.color}` : "1px solid #27272a",
                      }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: s.color, fontFamily: "var(--mono)" }}>{s.d}%</div>
                        <div style={{ fontSize: 9, color: "#71717a" }}>{s.label}</div>
                        <div style={{ fontSize: 10, color: "#52525b", fontFamily: "var(--mono)" }}>R{price}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Block>
          </div>
        </div>
      )}

      {/* TAB 2: USERS & FREQUENCY */}
      {tab === "volume" && (
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
          <div>
            <Block title="ADOPTION CONTROLS">
              <Slider label="Monthly Consultations (clinic chain)" value={monthlyConsults} onChange={setMonthlyConsults} min={75000} max={130000} step={5000} note="Total across 225 clinics" />
              <Slider label="Voucher Adoption Rate" value={adoptionPct} onChange={setAdoptionPct} min={5} max={50} step={1} suffix="%" note="% of existing patients who switch to vouchers" />
              <Slider label="Vouchers per User per Month" value={vouchersPerUserMonth} onChange={setVouchersPerUserMonth} min={1} max={4} step={1} note="Whole number: GP visits that month" />
              <Slider label="Monthly Adoption Growth" value={monthlyAdoptionGrowth} onChange={setMonthlyAdoptionGrowth} min={1} max={8} step={0.5} suffix="% pts" note="How many more % of patients adopt each month" />
            </Block>
          </div>

          <div>
            <Block title="WHO NEEDS TO BUY, AND HOW OFTEN">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                <Stat label="Monthly Consultations" value={fmtNum(monthlyConsults)} sub={`${clinicCount} clinics × ~${Math.round(monthlyConsults / clinicCount)}/clinic`} color="#3b82f6" />
                <Stat label="Voucher Adopters" value={fmtNum(m.voucherUsers)} sub={`${adoptionPct}% of patients`} color="#10b981" />
                <Stat label="Vouchers Sold / Month" value={fmtNum(m.monthlyVouchersSold)} sub={`${vouchersPerUserMonth} per user × ${fmtNum(m.voucherUsers)} users`} color="#f59e0b" />
              </div>

              {/* The key number */}
              <div style={{
                background: "rgba(16,185,129,0.06)",
                border: "2px solid rgba(16,185,129,0.3)",
                borderRadius: 10, padding: 20, textAlign: "center", marginBottom: 16,
              }}>
                <div style={{ fontSize: 11, color: "#10b981", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>To hit profitability, Carewallet needs</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: "#fafafa", fontFamily: "var(--mono)" }}>
                  {m.netRevPerVoucher > 0 ? fmtNum(Math.ceil(m.totalMonthlyCostZAR / m.netRevPerVoucher)) : "—"}
                </div>
                <div style={{ fontSize: 12, color: "#a1a1aa" }}>vouchers per month to cover R{Math.round(m.totalMonthlyCostZAR).toLocaleString()} burn</div>
                <div style={{ fontSize: 12, color: "#52525b", marginTop: 6 }}>
                  That's just <span style={{ color: "#10b981", fontWeight: 700 }}>
                    {m.netRevPerVoucher > 0 ? pct(Math.ceil(m.totalMonthlyCostZAR / m.netRevPerVoucher) / monthlyConsults) : "—"}
                  </span> of this clinic chain's monthly volume
                </div>
              </div>

              {/* Scenario grid */}
              <Block title="SCENARIO MATRIX — Vouchers needed for breakeven" accent="#f59e0b">
                <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: 14, overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "var(--mono)" }}>
                    <thead>
                      <tr>
                        <th style={{ padding: "6px 4px", textAlign: "left", color: "#52525b", fontSize: 10 }}>Adoption ↓ / Freq →</th>
                        {[1, 2, 3].map(f => (
                          <th key={f} style={{ padding: "6px 4px", textAlign: "right", color: f === vouchersPerUserMonth ? "#f59e0b" : "#71717a", fontSize: 10 }}>{f} visit{f > 1 ? "s" : ""}/mo</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[5, 10, 15, 20, 30].map(a => (
                        <tr key={a} style={{ borderTop: "1px solid #27272a" }}>
                          <td style={{ padding: "6px 4px", color: a === adoptionPct ? "#10b981" : "#a1a1aa", fontWeight: a === adoptionPct ? 700 : 400 }}>{a}% ({fmtNum(Math.round(monthlyConsults * a / 100))} users)</td>
                          {[1, 2, 3].map(f => {
                            const vouchers = Math.round(monthlyConsults * (a / 100)) * f;
                            const rev = vouchers * m.netRevPerVoucher;
                            const profit = rev - m.totalMonthlyCostZAR;
                            const isActive = a === adoptionPct && f === vouchersPerUserMonth;
                            return (
                              <td key={f} style={{
                                padding: "6px 4px", textAlign: "right",
                                color: profit > 0 ? "#10b981" : "#ef4444",
                                fontWeight: isActive ? 800 : 400,
                                background: isActive ? "rgba(16,185,129,0.08)" : "transparent",
                                borderRadius: isActive ? 4 : 0,
                              }}>
                                {fmt(profit)}/mo
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Block>

              <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 11, color: "#a1a1aa", lineHeight: 1.6 }}>
                  <strong style={{ color: "#fafafa" }}>Key insight:</strong> With {fmtNum(monthlyConsults)} monthly consultations across 225 clinics, 
                  even a modest {adoptionPct}% adoption rate gives us {fmtNum(m.monthlyVouchersSold)} vouchers/month.
                  At {fmtFull(m.netRevPerVoucher)} net per voucher, Carewallet earns {fmt(m.monthlyNetRev)} against a {fmt(m.totalMonthlyCostZAR)} burn.
                  {m.monthlyProfit > 0 
                    ? <span style={{ color: "#10b981" }}> That's profitable from day one.</span>
                    : <span style={{ color: "#f59e0b" }}> Needs {pct((m.totalMonthlyCostZAR / m.netRevPerVoucher) / monthlyConsults)} adoption to break even.</span>
                  }
                </div>
              </div>
            </Block>
          </div>
        </div>
      )}

      {/* TAB 3: CLINIC P&L IMPACT */}
      {tab === "clinic" && (
        <>
          <Block title="WHAT'S IN IT FOR THE CLINIC CHAIN?">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 11, color: "#71717a", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Current State (Cash Only)</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#fafafa", fontFamily: "var(--mono)", marginBottom: 4 }}>{fmt(m.currentMonthlyRevenue)}</div>
                <div style={{ fontSize: 11, color: "#52525b" }}>{fmtNum(monthlyConsults)} consults × R{cashPrice} avg</div>
                <div style={{ borderTop: "1px solid #27272a", marginTop: 12, paddingTop: 10 }}>
                  {[
                    "Variable pricing → patient distrust",
                    "No patient data or CRM",
                    "Zero revenue predictability",
                    "High patient churn, no loyalty",
                    "No digital presence",
                    "No way to reach lapsed patients",
                  ].map((p, i) => (
                    <div key={i} style={{ fontSize: 11, color: "#ef4444", padding: "3px 0", display: "flex", gap: 6 }}>
                      <span>✗</span><span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: "#18181b", border: "2px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 11, color: "#10b981", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>With Carewallet (Month 12)</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#10b981", fontFamily: "var(--mono)", marginBottom: 4 }}>
                  {m.months[11] ? fmt(m.months[11].clinicActual) : "—"}
                </div>
                <div style={{ fontSize: 11, color: "#52525b" }}>
                  {m.months[11] ? (m.months[11].clinicDelta >= 0 
                    ? `+${fmt(m.months[11].clinicDelta)} vs baseline (${pct(m.month12ClinicPct)} growth)` 
                    : `${fmt(m.months[11].clinicDelta)} vs baseline`) : "—"}
                </div>
                <div style={{ borderTop: "1px solid #27272a", marginTop: 12, paddingTop: 10 }}>
                  {[
                    "Transparent, fixed voucher pricing",
                    "Full patient CRM & visit history",
                    "Guaranteed pre-paid revenue",
                    "Voucher lock-in = patient loyalty",
                    "Digital marketplace listing",
                    "Re-engagement campaigns to lapsed patients",
                  ].map((p, i) => (
                    <div key={i} style={{ fontSize: 11, color: "#10b981", padding: "3px 0", display: "flex", gap: 6 }}>
                      <span>✓</span><span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Block>

          <Block title="CLINIC PROFIT PER VOUCHER PATIENT" accent="#3b82f6">
            <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, color: "#a1a1aa", marginBottom: 12, lineHeight: 1.6 }}>
                Yes, the clinic receives <strong style={{ color: "#ef4444" }}>{fmtFull(m.clinicRevenuePerConsultVoucher)}</strong> per voucher consult vs <strong>{fmtFull(cashPrice)}</strong> cash.
                But here's why the trade-off works:
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  {
                    title: "Repeat Visits ↑",
                    metric: "+8-15%",
                    desc: "Voucher holders visit more frequently. Pre-paid = zero friction to return.",
                    color: "#10b981",
                  },
                  {
                    title: "New Patients",
                    metric: "+12%",
                    desc: "Lower price attracts patients who previously couldn't afford private care.",
                    color: "#3b82f6",
                  },
                  {
                    title: "Zero Bad Debt",
                    metric: "100%",
                    desc: "Pre-paid eliminates non-payment. Cash patients sometimes negotiate or default.",
                    color: "#f59e0b",
                  },
                  {
                    title: "Capacity Fill",
                    metric: "~{avg}".replace("{avg}", Math.round(monthlyConsults / clinicCount / 22).toString()) + "/day",
                    desc: "Currently ~" + Math.round(monthlyConsults / clinicCount / 22) + " consults/day per clinic. Vouchers fill empty slots.",
                    color: "#a855f7",
                  },
                  {
                    title: "Data Value",
                    metric: "3M+",
                    desc: "Historic records become actionable: predict demand, personalize care, reduce waste.",
                    color: "#ec4899",
                  },
                  {
                    title: "Brand Lock-in",
                    metric: "Exclusive",
                    desc: "Vouchers tied to THIS chain only. Patients can't redeem at competitors.",
                    color: "#06b6d4",
                  },
                ].map((item, i) => (
                  <div key={i} style={{ background: "#0c0c0e", borderRadius: 6, padding: 12, border: "1px solid #27272a" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: item.color, fontFamily: "var(--mono)", marginBottom: 4 }}>{item.metric}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#e4e4e7", marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 10, color: "#71717a", lineHeight: 1.4 }}>{item.desc}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 16, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 6, padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#10b981", marginBottom: 4 }}>The math on lower margin + higher volume:</div>
                <div style={{ fontSize: 11, color: "#a1a1aa", lineHeight: 1.6 }}>
                  A clinic doing {Math.round(monthlyConsults / clinicCount)} consults/month at R{cashPrice} cash = {fmt(Math.round(monthlyConsults / clinicCount) * cashPrice)}/month.
                  With {adoptionPct}% voucher adoption + 12% new patients + 8% repeat uplift, total volume grows while per-unit margin adjusts.
                  By month 12, the net effect on revenue is <strong style={{ color: m.month12ClinicPct >= 0 ? "#10b981" : "#f59e0b" }}>{pct(m.month12ClinicPct)}</strong>.
                </div>
              </div>
            </div>
          </Block>
        </>
      )}

      {/* TAB 4: 12-MONTH COMPARISON GRAPH */}
      {tab === "projection" && (
        <>
          <Block title="CLINIC CHAIN REVENUE: BASELINE vs WITH CAREWALLET">
            {/* Revenue comparison chart */}
            <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 11 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 12, height: 3, background: "#52525b", borderRadius: 2 }} />
                  <span style={{ color: "#71717a" }}>Baseline (cash only)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 12, height: 3, background: "#10b981", borderRadius: 2 }} />
                  <span style={{ color: "#10b981" }}>With Carewallet</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 12, height: 8, background: "rgba(16,185,129,0.15)", borderRadius: 1 }} />
                  <span style={{ color: "#71717a" }}>Uplift</span>
                </div>
              </div>

              {/* Chart area */}
              <div style={{ height: 240, display: "flex", alignItems: "flex-end", gap: 4, position: "relative", paddingLeft: 60, paddingBottom: 24 }}>
                {/* Y-axis labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((pctY, i) => {
                  const val = maxClinicRev * pctY;
                  return (
                    <div key={i} style={{
                      position: "absolute",
                      left: 0, bottom: 24 + (216 * pctY),
                      fontSize: 9, color: "#3f3f46", fontFamily: "var(--mono)",
                      width: 55, textAlign: "right",
                    }}>
                      {fmt(val)}
                    </div>
                  );
                })}

                {/* Grid lines */}
                {[0.25, 0.5, 0.75, 1].map((pctY, i) => (
                  <div key={i} style={{
                    position: "absolute",
                    left: 60, right: 0,
                    bottom: 24 + (216 * pctY),
                    borderTop: "1px solid #1a1a1e",
                  }} />
                ))}

                {/* Bars */}
                {m.months.map((mo, i) => {
                  const baseH = (mo.clinicBaseline / maxClinicRev) * 216;
                  const actualH = (mo.clinicActual / maxClinicRev) * 216;
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", height: 216, position: "relative" }}>
                      {/* Actual bar */}
                      <div style={{
                        width: "80%",
                        height: actualH,
                        borderRadius: "3px 3px 0 0",
                        position: "relative",
                        overflow: "hidden",
                      }}>
                        {/* Baseline portion */}
                        <div style={{
                          position: "absolute",
                          bottom: 0,
                          width: "100%",
                          height: baseH,
                          background: "#27272a",
                        }} />
                        {/* Uplift portion */}
                        <div style={{
                          position: "absolute",
                          bottom: baseH,
                          width: "100%",
                          height: Math.max(0, actualH - baseH),
                          background: "rgba(16,185,129,0.25)",
                          borderTop: "2px solid #10b981",
                        }} />
                      </div>
                      {/* Month label */}
                      <div style={{ fontSize: 9, color: "#52525b", marginTop: 4, fontFamily: "var(--mono)" }}>M{mo.month}</div>
                    </div>
                  );
                })}
              </div>

              {/* Summary below chart */}
              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <Stat label="Year 1 Baseline Revenue" value={fmt(m.months.reduce((s, x) => s + x.clinicBaseline, 0))} color="#71717a" />
                <Stat label="Year 1 With Carewallet" value={fmt(m.months.reduce((s, x) => s + x.clinicActual, 0))} color="#10b981" />
                <Stat label="12-Month Uplift" value={fmt(m.year1ClinicUplift)} sub={m.year1ClinicUplift >= 0 ? "additional revenue" : "trade-off"} color={m.year1ClinicUplift >= 0 ? "#10b981" : "#f59e0b"} />
              </div>
            </div>
          </Block>

          <Block title="MONTH-BY-MONTH DETAIL" accent="#f59e0b">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, fontFamily: "var(--mono)" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #27272a" }}>
                    {["Mo", "Adopt%", "Voucher Users", "V. Sold", "New Patients", "Repeats", "Clinic Baseline", "Clinic Actual", "Δ Revenue", "CW Profit", "CW Cum P&L"].map(h => (
                      <th key={h} style={{ padding: "6px 4px", textAlign: "right", color: "#52525b", fontWeight: 600, fontSize: 9 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {m.months.map(mo => (
                    <tr key={mo.month} style={{ borderTop: "1px solid #1a1a1e", background: mo.cwProfit > 0 ? "rgba(16,185,129,0.02)" : "transparent" }}>
                      <td style={{ padding: "5px 4px", textAlign: "right", color: "#e4e4e7", fontWeight: 700 }}>{mo.month}</td>
                      <td style={{ padding: "5px 4px", textAlign: "right", color: "#a1a1aa" }}>{mo.adoptPct.toFixed(1)}%</td>
                      <td style={{ padding: "5px 4px", textAlign: "right", color: "#a1a1aa" }}>{fmtNum(mo.voucherUsers)}</td>
                      <td style={{ padding: "5px 4px", textAlign: "right", color: "#f59e0b" }}>{fmtNum(mo.vouchersSold)}</td>
                      <td style={{ padding: "5px 4px", textAlign: "right", color: "#3b82f6" }}>+{fmtNum(mo.newPatients)}</td>
                      <td style={{ padding: "5px 4px", textAlign: "right", color: "#a855f7" }}>+{fmtNum(mo.repeatUplift)}</td>
                      <td style={{ padding: "5px 4px", textAlign: "right", color: "#71717a" }}>{fmt(mo.clinicBaseline)}</td>
                      <td style={{ padding: "5px 4px", textAlign: "right", color: "#10b981" }}>{fmt(mo.clinicActual)}</td>
                      <td style={{ padding: "5px 4px", textAlign: "right", color: mo.clinicDelta >= 0 ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                        {mo.clinicDelta >= 0 ? "+" : ""}{fmt(mo.clinicDelta)}
                      </td>
                      <td style={{ padding: "5px 4px", textAlign: "right", color: mo.cwProfit > 0 ? "#10b981" : "#ef4444" }}>{fmt(mo.cwProfit)}</td>
                      <td style={{ padding: "5px 4px", textAlign: "right", color: mo.cumCWProfit > 0 ? "#10b981" : "#ef4444" }}>{fmt(mo.cumCWProfit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Block>
        </>
      )}

      {/* TAB 5: PITCH SUMMARY */}
      {tab === "pitch" && (
        <>
          <Block title="EXECUTIVE PITCH SUMMARY">
            <div style={{
              background: "#18181b", border: "2px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: 24,
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981", marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>
                  The Proposition
                </div>
                {[
                  {
                    q: "1. What should vouchers sell for?",
                    a: `R${voucherPrice} — a ${pct(m.consumerDiscountPct)} discount off the R${cashPrice} cash price. This sits in the proven 20-33% discount range that Discovery and Unu have validated in the SA market.`,
                  },
                  {
                    q: "2. How many users need to buy?",
                    a: `Just ${m.netRevPerVoucher > 0 ? fmtNum(Math.ceil(m.totalMonthlyCostZAR / m.netRevPerVoucher)) : "—"} vouchers/month covers Carewallet's entire cost base. That's ${m.netRevPerVoucher > 0 ? pct(Math.ceil(m.totalMonthlyCostZAR / m.netRevPerVoucher) / monthlyConsults) : "—"} of the chain's monthly volume — a trivially small fraction.`,
                  },
                  {
                    q: "3. How frequently do they buy?",
                    a: `${vouchersPerUserMonth} voucher${vouchersPerUserMonth > 1 ? "s" : ""} per user per month. SA data shows the uninsured average 3.2 GP visits/year. Voucher programs increase this because pre-payment removes the friction of deciding to spend.`,
                  },
                  {
                    q: "4. Clinic monthly profit impact?",
                    a: `By month 12, the clinic chain sees ${m.months[11]?.clinicDelta >= 0 ? "+" : ""}${fmt(m.months[11]?.clinicDelta || 0)} per month versus doing nothing. Over 12 months, cumulative impact: ${m.year1ClinicUplift >= 0 ? "+" : ""}${fmt(m.year1ClinicUplift)}.`,
                  },
                ].map((item, i) => (
                  <div key={i} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fafafa", marginBottom: 4 }}>{item.q}</div>
                    <div style={{ fontSize: 11, color: "#a1a1aa", lineHeight: 1.6 }}>{item.a}</div>
                  </div>
                ))}
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>
                  The Numbers
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                  <Stat label="Voucher Price" value={`R${voucherPrice}`} color="#3b82f6" />
                  <Stat label="Consumer Saves" value={pct(m.consumerDiscountPct)} color="#10b981" />
                  <Stat label="Clinic Gets" value={fmtFull(gpPayoutRate - m.platformFee)} sub="per voucher redemption" color="#a855f7" />
                  <Stat label="CW Earns" value={fmtFull(m.netRevPerVoucher)} sub="net per voucher" color="#f59e0b" />
                  <Stat label="CW Break-even" value={m.breakEvenMonth ? `Month ${m.breakEvenMonth}` : "—"} color="#10b981" />
                  <Stat label="CW Year 1 Profit" value={fmt(m.year1CWProfit)} color={m.year1CWProfit > 0 ? "#10b981" : "#ef4444"} />
                </div>

                <div style={{ background: "#0c0c0e", borderRadius: 8, padding: 14, border: "1px solid #27272a" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#fafafa", marginBottom: 8 }}>Why this works for the clinic chain:</div>
                  <div style={{ fontSize: 11, color: "#a1a1aa", lineHeight: 1.7 }}>
                    225 clinics doing {fmtNum(monthlyConsults)} consultations/month with 3M+ historic records sitting unused.
                    Carewallet turns those records into a re-engagement engine: lapsed patients get voucher offers, 
                    active patients get loyalty pricing, and the chain gets guaranteed pre-paid revenue instead of 
                    unpredictable cash flow. The 10% platform fee funds CRM tools, booking infrastructure, and 
                    patient analytics that the chain doesn't currently have — at a fraction of what building it 
                    internally would cost.
                  </div>
                </div>

                <div style={{ marginTop: 16, background: "rgba(59,130,246,0.06)", borderRadius: 8, padding: 14, border: "1px solid rgba(59,130,246,0.2)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6", marginBottom: 6 }}>Regulatory advantage</div>
                  <div style={{ fontSize: 11, color: "#a1a1aa", lineHeight: 1.6 }}>
                    Health vouchers in South Africa are unregulated — they fall outside both medical scheme and 
                    insurance legislation. Discovery, Netcare, and CareWorks all operate voucher programs without 
                    additional licensing. Carewallet inherits this same regulatory clarity.
                  </div>
                </div>
              </div>
            </div>
          </Block>

          {/* One-liner for investors */}
          <div style={{
            background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(59,130,246,0.08))",
            border: "1px solid rgba(16,185,129,0.2)",
            borderRadius: 10, padding: 24, textAlign: "center", marginTop: 8,
          }}>
            <div style={{ fontSize: 10, color: "#10b981", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>The ask</div>
            <div style={{ fontSize: 16, color: "#fafafa", fontWeight: 600, lineHeight: 1.5 }}>
              "Let us turn your 225 clinics and 3M patient records into a voucher-powered 
              retainership platform — at zero upfront cost. We earn only when your patients buy."
            </div>
          </div>
        </>
      )}

      <div style={{ textAlign: "center", padding: "20px 0 8px", borderTop: "1px solid #1a1a1e", marginTop: 24, fontSize: 9, color: "#3f3f46" }}>
        Carewallet Business Case · Clinic Chain Partnership Model · All figures in ZAR · March 2026
      </div>
    </div>
  );
}