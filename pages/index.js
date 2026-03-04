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
  const consultsPerGPPerDay = 32;
  const workingDaysPerMonth = 22;
  const maxCapacity = clinicCount * consultsPerGPPerDay * workingDaysPerMonth; // 158,400
  const totalHistoricConsults = 3_000_000;

  // Pricing
  const [cashPrice, setCashPrice] = useState(520);
  const [voucherPrice, setVoucherPrice] = useState(380);
  const [gpPayoutRate, setGpPayoutRate] = useState(290);
  const [platformFeePct, setPlatformFeePct] = useState(10);

  // Capacity-based levers (v2 model)
  const [emptySlotFillPct, setEmptySlotFillPct] = useState(20);
  const [cannibalizationPct, setCannibalizationPct] = useState(5);
  const [vouchersPerUserMonth, setVouchersPerUserMonth] = useState(1);
  const [monthlyFillGrowth, setMonthlyFillGrowth] = useState(3);

  // Carewallet costs (lean)
  const infraCostUSD = 100;
  const salaryCEO_USD = 1500;
  const salaryCTO_USD = 1500;
  const totalMonthlyCostZAR = (infraCostUSD + salaryCEO_USD + salaryCTO_USD) * FX;

  const [tab, setTab] = useState("case");

  const m = useMemo(() => {
    // Derived capacity
    const emptySlots = maxCapacity - monthlyConsults;
    const utilization = monthlyConsults / maxCapacity;

    // Unit economics
    const consumerDiscount = cashPrice - voucherPrice;
    const consumerDiscountPct = consumerDiscount / cashPrice;
    const platformFee = gpPayoutRate * (platformFeePct / 100);
    const spread = voucherPrice - gpPayoutRate;
    const totalRevPerVoucher = spread + platformFee;
    const paymentProcessing = voucherPrice * 0.025;
    const netRevPerVoucher = totalRevPerVoucher - paymentProcessing;

    // Clinic economics per voucher
    const clinicNetPerVoucher = gpPayoutRate - platformFee;
    const clinicCannibLossPerPatient = cashPrice - clinicNetPerVoucher;

    // Month 1 volume
    const newPatients = Math.round(emptySlots * (emptySlotFillPct / 100)) * vouchersPerUserMonth;
    const cannibalized = Math.round(monthlyConsults * (cannibalizationPct / 100));
    const repeatVisits = Math.round(newPatients * 0.08);
    const totalVouchers = newPatients + cannibalized + repeatVisits;

    // Month 1 Clinic P&L
    const cashPatients = monthlyConsults - cannibalized;
    const clinicCashRev = cashPatients * cashPrice;
    const clinicVoucherRev = totalVouchers * clinicNetPerVoucher;
    const clinicTotal = clinicCashRev + clinicVoucherRev;
    const clinicBaseline = monthlyConsults * cashPrice;
    const clinicDeltaM1 = clinicTotal - clinicBaseline;

    // Clinic gain/cost breakdown
    const clinicNewGain = newPatients * clinicNetPerVoucher;
    const clinicRepeatGain = repeatVisits * clinicNetPerVoucher;
    const clinicCannibLoss = cannibalized * clinicCannibLossPerPatient;
    const clinicNetImpact = clinicNewGain + clinicRepeatGain - clinicCannibLoss;

    // Carewallet P&L
    const monthlyGMV = totalVouchers * voucherPrice;
    const monthlyGrossRev = totalVouchers * totalRevPerVoucher;
    const monthlyNetRev = totalVouchers * netRevPerVoucher;
    const monthlyProfit = monthlyNetRev - totalMonthlyCostZAR;
    const breakEvenVouchers = netRevPerVoucher > 0 ? Math.ceil(totalMonthlyCostZAR / netRevPerVoucher) : Infinity;

    const currentMonthlyRevenue = monthlyConsults * cashPrice;
    const avgConsultsPerClinic = monthlyConsults / clinicCount;

    // 12-month projection (capacity-based)
    const months = [];
    let fillPct = emptySlotFillPct;
    let cumCWProfit = 0;
    let breakEvenMonth = null;

    for (let i = 1; i <= 12; i++) {
      if (i > 1) fillPct = Math.min(fillPct + monthlyFillGrowth, 80);

      const moNewPatients = Math.round(emptySlots * (fillPct / 100)) * vouchersPerUserMonth;
      const moCannibalized = cannibalized; // stays flat
      const moRepeatVisits = Math.round(moNewPatients * 0.08);
      const moTotalVouchers = moNewPatients + moCannibalized + moRepeatVisits;

      // Clinic
      const moCashPatients = monthlyConsults - moCannibalized;
      const moClinicCashRev = moCashPatients * cashPrice;
      const moClinicVoucherRev = moTotalVouchers * clinicNetPerVoucher;
      const moClinicTotal = moClinicCashRev + moClinicVoucherRev;
      const moClinicBaseline = monthlyConsults * cashPrice;
      const moClinicDelta = moClinicTotal - moClinicBaseline;

      // Carewallet
      const moCWRev = moTotalVouchers * netRevPerVoucher;
      const moCWProfit = moCWRev - totalMonthlyCostZAR;
      cumCWProfit += moCWProfit;
      if (moCWProfit > 0 && !breakEvenMonth) breakEvenMonth = i;

      months.push({
        month: i,
        fillPct,
        newPatients: moNewPatients,
        cannibalized: moCannibalized,
        repeatVisits: moRepeatVisits,
        totalVouchers: moTotalVouchers,
        clinicBaseline: moClinicBaseline,
        clinicActual: moClinicTotal,
        clinicDelta: moClinicDelta,
        cwRevenue: moCWRev,
        cwProfit: moCWProfit,
        cumCWProfit,
      });
    }

    return {
      emptySlots,
      utilization,
      maxCapacity,
      consumerDiscount,
      consumerDiscountPct,
      platformFee,
      spread,
      totalRevPerVoucher,
      paymentProcessing,
      netRevPerVoucher,
      clinicNetPerVoucher,
      clinicCannibLossPerPatient,
      newPatients,
      cannibalized,
      repeatVisits,
      totalVouchers,
      clinicNewGain,
      clinicRepeatGain,
      clinicCannibLoss,
      clinicNetImpact,
      monthlyGMV,
      monthlyGrossRev,
      monthlyNetRev,
      monthlyProfit,
      breakEvenVouchers,
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
  }, [cashPrice, voucherPrice, gpPayoutRate, platformFeePct, monthlyConsults, emptySlotFillPct, cannibalizationPct, vouchersPerUserMonth, monthlyFillGrowth]);

  const tabs = [
    { id: "case", label: "1. Voucher Pricing" },
    { id: "volume", label: "2. Capacity & Volume" },
    { id: "clinic", label: "3. Clinic P\u0026L Impact" },
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
            <div style={{ fontSize: 12, color: "#52525b", marginTop: 3 }}>
              {clinicCount} clinics · {fmtNum(monthlyConsults)} consults/mo · {fmtNum(m.emptySlots)} empty slots · {pct(m.utilization)} utilization
            </div>
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
        <Stat label="Carewallet Monthly Profit" value={fmt(m.monthlyProfit)} sub={`on ${fmtNum(m.totalVouchers)} vouchers`} color={m.monthlyProfit > 0 ? "#10b981" : "#ef4444"} size="large" />
        <Stat label="Break-even" value={m.breakEvenMonth ? `Month ${m.breakEvenMonth}` : "Month 1"} sub={m.totalVouchers >= m.breakEvenVouchers ? `Need ${fmtNum(m.breakEvenVouchers)} — have ${fmtNum(m.totalVouchers)}` : `Need ${fmtNum(m.breakEvenVouchers)} vouchers`} color={m.monthlyProfit > 0 ? "#10b981" : "#f59e0b"} size="large" />
      </div>

      {/* TAB 1: VOUCHER PRICING */}
      {tab === "case" && (
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
          <div>
            <Block title="PRICING CONTROLS">
              <Slider label="Cash Walk-in Price" value={cashPrice} onChange={setCashPrice} min={350} max={650} step={10} prefix="R" note="What patients currently pay at this clinic chain" />
              <Slider label="Voucher Price (consumer pays)" value={voucherPrice} onChange={setVoucherPrice} min={200} max={500} step={10} prefix="R" note="Must hit 20%+ discount to change behavior" />
              <Slider label="GP Payout (clinic receives)" value={gpPayoutRate} onChange={setGpPayoutRate} min={150} max={450} step={10} prefix="R" note="What Carewallet remits to the clinic per redemption" />
              <Slider label="Platform Fee %" value={platformFeePct} onChange={setPlatformFeePct} min={3} max={20} step={1} suffix="%" note="Charged to clinic for CRM, analytics, booking tools" />
            </Block>
            <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#71717a", marginBottom: 10 }}>Platform fee to clinic</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#f59e0b", fontFamily: "var(--mono)" }}>{platformFeePct}%</div>
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
                    { label: "\u2192", amount: null, color: "#52525b", width: 20 },
                    { label: "Clinic gets", amount: m.clinicNetPerVoucher, color: "#10b981", width: 100 },
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
                    { label: "Clinic net receipt", value: m.clinicNetPerVoucher, color: "#10b981" },
                    { label: `Platform fee (${platformFeePct}%)`, value: m.platformFee, color: "#f59e0b" },
                    { label: "Spread (voucher - GP rate)", value: m.spread, color: "#3b82f6" },
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

            <Block title="PRICE SENSITIVITY \u2014 WHAT THE MARKET TELLS US" accent="#3b82f6">
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

      {/* TAB 2: CAPACITY & VOLUME (v2 model) */}
      {tab === "volume" && (
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
          <div>
            <Block title="CAPACITY CONTROLS">
              <Slider label="Monthly Consultations (actual)" value={monthlyConsults} onChange={setMonthlyConsults} min={75000} max={130000} step={5000} note={`Total across ${clinicCount} clinics (max capacity: ${fmtNum(maxCapacity)})`} />
              <Slider label="Empty Slot Fill Rate" value={emptySlotFillPct} onChange={setEmptySlotFillPct} min={5} max={60} step={1} suffix="%" note="% of empty slots filled by voucher patients (new patients)" />
              <Slider label="Cannibalization Rate" value={cannibalizationPct} onChange={setCannibalizationPct} min={0} max={15} step={1} suffix="%" note="% of existing cash patients who switch to vouchers" />
              <Slider label="Vouchers per User per Month" value={vouchersPerUserMonth} onChange={setVouchersPerUserMonth} min={1} max={4} step={1} note="Whole number: GP visits that month" />
              <Slider label="Monthly Fill Rate Growth" value={monthlyFillGrowth} onChange={setMonthlyFillGrowth} min={1} max={8} step={0.5} suffix="% pts" note="How fast vouchers fill more empty slots each month (caps at 80%)" />
            </Block>
          </div>

          <div>
            {/* Utilization bar */}
            <Block title="CLINIC CHAIN CAPACITY">
              <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "#71717a", marginBottom: 10 }}>Monthly capacity utilization</div>
                <div style={{ background: "#27272a", borderRadius: 6, height: 36, overflow: "hidden", position: "relative", marginBottom: 8 }}>
                  <div style={{
                    width: `${(monthlyConsults / maxCapacity) * 100}%`,
                    height: "100%",
                    background: "#3b82f6",
                    position: "absolute",
                    left: 0,
                    borderRadius: "6px 0 0 6px",
                  }} />
                  <div style={{
                    width: `${(m.newPatients / maxCapacity) * 100}%`,
                    height: "100%",
                    background: "#10b981",
                    position: "absolute",
                    left: `${(monthlyConsults / maxCapacity) * 100}%`,
                  }} />
                  <div style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 10, fontWeight: 700, color: "#fafafa" }}>
                    {fmtNum(monthlyConsults)} current ({pct(m.utilization)})
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 10, height: 10, background: "#3b82f6", borderRadius: 2 }} />
                    <span style={{ color: "#a1a1aa" }}>Current cash patients ({fmtNum(monthlyConsults)})</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 10, height: 10, background: "#10b981", borderRadius: 2 }} />
                    <span style={{ color: "#a1a1aa" }}>New voucher patients ({fmtNum(m.newPatients)})</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 10, height: 10, background: "#27272a", borderRadius: 2 }} />
                    <span style={{ color: "#71717a" }}>Still empty ({fmtNum(m.emptySlots - m.newPatients)})</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                <Stat label="Max Capacity" value={fmtNum(maxCapacity)} sub={`${clinicCount} \u00d7 ${consultsPerGPPerDay} \u00d7 ${workingDaysPerMonth} days`} color="#71717a" />
                <Stat label="Empty Slots" value={fmtNum(m.emptySlots)} sub={`${pct(1 - m.utilization)} unused`} color="#f59e0b" />
                <Stat label="New Patients (voucher)" value={fmtNum(m.newPatients)} sub={`${emptySlotFillPct}% of empty slots filled`} color="#10b981" />
                <Stat label="Cannibalized" value={fmtNum(m.cannibalized)} sub={`${cannibalizationPct}% of cash switch`} color="#ef4444" />
              </div>
            </Block>

            {/* The clinic equation */}
            <Block title="THE CLINIC EQUATION \u2014 GAIN vs COST" accent="#f59e0b">
              <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr", gap: 12, alignItems: "center", marginBottom: 16 }}>
                  <div style={{ textAlign: "center", padding: 12, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: "#10b981", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>GAIN: New Patients</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#10b981", fontFamily: "var(--mono)" }}>+{fmt(m.clinicNewGain + m.clinicRepeatGain)}</div>
                    <div style={{ fontSize: 10, color: "#71717a", marginTop: 2 }}>{fmtNum(m.newPatients + m.repeatVisits)} patients \u00d7 {fmtFull(m.clinicNetPerVoucher)}</div>
                    <div style={{ fontSize: 9, color: "#52525b", marginTop: 2 }}>Was earning R0 on these slots</div>
                  </div>
                  <div style={{ fontSize: 24, color: "#52525b", fontWeight: 300 }}>\u2212</div>
                  <div style={{ textAlign: "center", padding: 12, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: "#ef4444", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>COST: Cannibalization</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#ef4444", fontFamily: "var(--mono)" }}>\u2212{fmt(m.clinicCannibLoss)}</div>
                    <div style={{ fontSize: 10, color: "#71717a", marginTop: 2 }}>{fmtNum(m.cannibalized)} patients \u00d7 {fmtFull(m.clinicCannibLossPerPatient)} lost</div>
                    <div style={{ fontSize: 9, color: "#52525b", marginTop: 2 }}>Cash patients who switch to voucher</div>
                  </div>
                  <div style={{ fontSize: 24, color: "#52525b", fontWeight: 300 }}>=</div>
                  <div style={{ textAlign: "center", padding: 12, background: m.clinicNetImpact >= 0 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `2px solid ${m.clinicNetImpact >= 0 ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"}`, borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: m.clinicNetImpact >= 0 ? "#10b981" : "#ef4444", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>NET IMPACT</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: m.clinicNetImpact >= 0 ? "#10b981" : "#ef4444", fontFamily: "var(--mono)" }}>{m.clinicNetImpact >= 0 ? "+" : ""}{fmt(m.clinicNetImpact)}</div>
                    <div style={{ fontSize: 10, color: "#71717a", marginTop: 2 }}>per month</div>
                  </div>
                </div>

                <div style={{ background: "#0c0c0e", borderRadius: 6, padding: 12, border: "1px solid #27272a" }}>
                  <div style={{ fontSize: 11, color: "#a1a1aa", lineHeight: 1.6 }}>
                    <strong style={{ color: "#fafafa" }}>Why it works:</strong> The clinic has {fmtNum(m.emptySlots)} empty slots earning R0 today.
                    Filling {emptySlotFillPct}% of those at {fmtFull(m.clinicNetPerVoucher)} each = <span style={{ color: "#10b981" }}>+{fmt(m.clinicNewGain)}</span> in pure incremental revenue.
                    Even after the {fmtFull(m.clinicCannibLoss)} cannibalization cost ({cannibalizationPct}% of cash patients switching),
                    the net impact is <strong style={{ color: m.clinicNetImpact >= 0 ? "#10b981" : "#ef4444" }}>{m.clinicNetImpact >= 0 ? "+" : ""}{fmt(m.clinicNetImpact)}/month</strong>.
                  </div>
                </div>
              </div>
            </Block>

            {/* Profitability target */}
            <div style={{
              background: "rgba(16,185,129,0.06)",
              border: "2px solid rgba(16,185,129,0.3)",
              borderRadius: 10, padding: 20, textAlign: "center",
            }}>
              <div style={{ fontSize: 11, color: "#10b981", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>To hit profitability, Carewallet needs</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "#fafafa", fontFamily: "var(--mono)" }}>
                {m.breakEvenVouchers < Infinity ? fmtNum(m.breakEvenVouchers) : "\u2014"}
              </div>
              <div style={{ fontSize: 12, color: "#a1a1aa" }}>vouchers/month to cover {fmtFull(m.totalMonthlyCostZAR)} burn</div>
              <div style={{ fontSize: 12, color: "#52525b", marginTop: 6 }}>
                Currently selling <span style={{ color: m.totalVouchers >= m.breakEvenVouchers ? "#10b981" : "#f59e0b", fontWeight: 700 }}>{fmtNum(m.totalVouchers)}</span> vouchers/month
                {m.totalVouchers >= m.breakEvenVouchers && <span style={{ color: "#10b981" }}> \u2014 profitable from month 1</span>}
              </div>
            </div>
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
                <div style={{ fontSize: 11, color: "#52525b" }}>{fmtNum(monthlyConsults)} consults \u00d7 R{cashPrice} avg</div>
                <div style={{ borderTop: "1px solid #27272a", marginTop: 12, paddingTop: 10 }}>
                  {[
                    "Variable pricing \u2192 patient distrust",
                    "No patient data or CRM",
                    "Zero revenue predictability",
                    "High patient churn, no loyalty",
                    "No digital presence",
                    `~${pct(1 - m.utilization)} of capacity sitting empty`,
                    "No way to reach lapsed patients from 3M records",
                  ].map((p, i) => (
                    <div key={i} style={{ fontSize: 11, color: "#ef4444", padding: "3px 0", display: "flex", gap: 6 }}>
                      <span>\u2717</span><span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: "#18181b", border: "2px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 11, color: "#10b981", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>With Carewallet (Month 12)</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#10b981", fontFamily: "var(--mono)", marginBottom: 4 }}>
                  {m.months[11] ? fmt(m.months[11].clinicActual) : "\u2014"}
                </div>
                <div style={{ fontSize: 11, color: "#52525b" }}>
                  {m.months[11] ? (m.months[11].clinicDelta >= 0
                    ? `+${fmt(m.months[11].clinicDelta)} vs baseline (${pct(m.month12ClinicPct)} growth)`
                    : `${fmt(m.months[11].clinicDelta)} vs baseline`) : "\u2014"}
                </div>
                <div style={{ borderTop: "1px solid #27272a", marginTop: 12, paddingTop: 10 }}>
                  {[
                    "Transparent, fixed voucher pricing",
                    "Full patient CRM & visit history",
                    "Guaranteed pre-paid revenue (zero bad debt)",
                    "Voucher lock-in = patient loyalty (THIS chain only)",
                    "Digital marketplace listing",
                    "Empty slots filled = pure incremental revenue",
                    "Re-engagement campaigns to lapsed patients",
                  ].map((p, i) => (
                    <div key={i} style={{ fontSize: 11, color: "#10b981", padding: "3px 0", display: "flex", gap: 6 }}>
                      <span>\u2713</span><span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Block>

          <Block title="CLINIC ECONOMICS: VOUCHER vs EMPTY CHAIR" accent="#3b82f6">
            <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, color: "#a1a1aa", marginBottom: 12, lineHeight: 1.6 }}>
                The clinic receives <strong style={{ color: "#10b981" }}>{fmtFull(m.clinicNetPerVoucher)}</strong> per voucher consult vs <strong>{fmtFull(cashPrice)}</strong> cash.
                But voucher patients are filling <strong style={{ color: "#f59e0b" }}>empty chairs</strong> \u2014 the clinic was earning R0 on those slots.
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  {
                    title: "Empty \u2192 Filled",
                    metric: fmtNum(m.emptySlots),
                    desc: `${fmtNum(m.emptySlots)} empty slots/month. Each filled slot at ${fmtFull(m.clinicNetPerVoucher)} is pure incremental revenue vs R0 today.`,
                    color: "#10b981",
                  },
                  {
                    title: "New Patients",
                    metric: `+${fmtNum(m.newPatients)}`,
                    desc: "Lapsed patients from 3M records, uninsured community members, and public clinic patients who'd switch at the lower price.",
                    color: "#3b82f6",
                  },
                  {
                    title: "Zero Bad Debt",
                    metric: "100%",
                    desc: "Pre-paid eliminates non-payment. Cash patients sometimes negotiate or default.",
                    color: "#f59e0b",
                  },
                  {
                    title: "Repeat Visits \u2191",
                    metric: `+${fmtNum(m.repeatVisits)}`,
                    desc: "Voucher holders visit 8% more frequently. Pre-paid = zero friction to return.",
                    color: "#a855f7",
                  },
                  {
                    title: "Cannibalization",
                    metric: `${cannibalizationPct}%`,
                    desc: `Only ${fmtNum(m.cannibalized)} cash patients switch. Controlled cost of ${fmt(m.clinicCannibLoss)}/mo \u2014 dwarfed by new patient gains.`,
                    color: "#ef4444",
                  },
                  {
                    title: "Brand Lock-in",
                    metric: "Exclusive",
                    desc: "Vouchers tied to THIS chain only. Patients can't redeem at competitors. CRM + data value included.",
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
                <div style={{ fontSize: 12, fontWeight: 700, color: "#10b981", marginBottom: 4 }}>The capacity argument:</div>
                <div style={{ fontSize: 11, color: "#a1a1aa", lineHeight: 1.6 }}>
                  {clinicCount} clinics at {pct(m.utilization)} utilization = {fmtNum(m.emptySlots)} empty slots/month earning nothing.
                  Filling {emptySlotFillPct}% of those adds {fmtNum(m.newPatients)} new patients at {fmtFull(m.clinicNetPerVoucher)} each.
                  Net monthly impact after {cannibalizationPct}% cannibalization: <strong style={{ color: m.clinicNetImpact >= 0 ? "#10b981" : "#f59e0b" }}>{m.clinicNetImpact >= 0 ? "+" : ""}{fmt(m.clinicNetImpact)}</strong>.
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

              <div style={{ height: 240, display: "flex", alignItems: "flex-end", gap: 4, position: "relative", paddingLeft: 60, paddingBottom: 24 }}>
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

                {[0.25, 0.5, 0.75, 1].map((pctY, i) => (
                  <div key={i} style={{
                    position: "absolute",
                    left: 60, right: 0,
                    bottom: 24 + (216 * pctY),
                    borderTop: "1px solid #1a1a1e",
                  }} />
                ))}

                {m.months.map((mo, i) => {
                  const baseH = (mo.clinicBaseline / maxClinicRev) * 216;
                  const actualH = (mo.clinicActual / maxClinicRev) * 216;
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", height: 216, position: "relative" }}>
                      <div style={{
                        width: "80%",
                        height: actualH,
                        borderRadius: "3px 3px 0 0",
                        position: "relative",
                        overflow: "hidden",
                      }}>
                        <div style={{
                          position: "absolute",
                          bottom: 0,
                          width: "100%",
                          height: baseH,
                          background: "#27272a",
                        }} />
                        <div style={{
                          position: "absolute",
                          bottom: baseH,
                          width: "100%",
                          height: Math.max(0, actualH - baseH),
                          background: "rgba(16,185,129,0.25)",
                          borderTop: "2px solid #10b981",
                        }} />
                      </div>
                      <div style={{ fontSize: 9, color: "#52525b", marginTop: 4, fontFamily: "var(--mono)" }}>M{mo.month}</div>
                    </div>
                  );
                })}
              </div>

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
                    {["Mo", "Fill%", "New Patients", "Cannib.", "Repeats", "Total V.", "Clinic Baseline", "Clinic Actual", "\u0394 Revenue", "CW Profit", "CW Cum P\u0026L"].map(h => (
                      <th key={h} style={{ padding: "6px 4px", textAlign: "right", color: "#52525b", fontWeight: 600, fontSize: 9 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {m.months.map(mo => (
                    <tr key={mo.month} style={{ borderTop: "1px solid #1a1a1e", background: mo.cwProfit > 0 ? "rgba(16,185,129,0.02)" : "transparent" }}>
                      <td style={{ padding: "5px 4px", textAlign: "right", color: "#e4e4e7", fontWeight: 700 }}>{mo.month}</td>
                      <td style={{ padding: "5px 4px", textAlign: "right", color: "#a1a1aa" }}>{mo.fillPct.toFixed(1)}%</td>
                      <td style={{ padding: "5px 4px", textAlign: "right", color: "#10b981" }}>{fmtNum(mo.newPatients)}</td>
                      <td style={{ padding: "5px 4px", textAlign: "right", color: "#ef4444" }}>{fmtNum(mo.cannibalized)}</td>
                      <td style={{ padding: "5px 4px", textAlign: "right", color: "#a855f7" }}>+{fmtNum(mo.repeatVisits)}</td>
                      <td style={{ padding: "5px 4px", textAlign: "right", color: "#f59e0b" }}>{fmtNum(mo.totalVouchers)}</td>
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
                    a: `R${voucherPrice} \u2014 a ${pct(m.consumerDiscountPct)} discount off the R${cashPrice} cash price. This sits in the proven 20-33% discount range that Discovery and Unu have validated in the SA market.`,
                  },
                  {
                    q: "2. Who buys vouchers?",
                    a: `People who can't afford R${cashPrice} cash \u2014 the 84% uninsured population, lapsed patients from the 3M records, and community members currently using public clinics. These fill empty slots. Only ~${cannibalizationPct}% of existing cash patients switch.`,
                  },
                  {
                    q: "3. What does the clinic gain?",
                    a: `~${fmtNum(m.newPatients)} new patients/month at ${fmtFull(m.clinicNetPerVoucher)} each = ~${fmt(m.clinicNewGain)} incremental revenue. Minus ~${fmt(m.clinicCannibLoss)} cannibalization = net ${m.clinicNetImpact >= 0 ? "+" : ""}${fmt(m.clinicNetImpact)}/month. Plus CRM, patient data, and digital presence they don't currently have.`,
                  },
                  {
                    q: "4. What does Carewallet earn?",
                    a: `${fmtFull(m.netRevPerVoucher)} net per voucher \u00d7 ~${fmtNum(m.totalVouchers)} vouchers = ~${fmt(m.monthlyNetRev)}/month. Break-even at just ~${fmtNum(m.breakEvenVouchers)} vouchers against ${fmtFull(m.totalMonthlyCostZAR)} monthly burn.${m.monthlyProfit > 0 ? " Profitable from month 1." : ""}`,
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
                  <Stat label="Clinic Gets" value={fmtFull(m.clinicNetPerVoucher)} sub="per voucher redemption" color="#a855f7" />
                  <Stat label="CW Earns" value={fmtFull(m.netRevPerVoucher)} sub="net per voucher" color="#f59e0b" />
                  <Stat label="CW Break-even" value={`${fmtNum(m.breakEvenVouchers)} vouchers`} color="#10b981" />
                  <Stat label="CW Year 1 Profit" value={fmt(m.year1CWProfit)} color={m.year1CWProfit > 0 ? "#10b981" : "#ef4444"} />
                </div>

                <div style={{ background: "#0c0c0e", borderRadius: 8, padding: 14, border: "1px solid #27272a" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#fafafa", marginBottom: 8 }}>Why this works for the clinic chain:</div>
                  <div style={{ fontSize: 11, color: "#a1a1aa", lineHeight: 1.7 }}>
                    {clinicCount} clinics running at {pct(m.utilization)} utilization = {fmtNum(m.emptySlots)} empty slots every month earning nothing.
                    Carewallet fills those slots with voucher patients from the 3M lapsed records and the uninsured community.
                    The clinic earns {fmtFull(m.clinicNetPerVoucher)} per new visit (vs R0 today). Cannibalization is controlled at {cannibalizationPct}%
                    and more than offset by new patient revenue. The {platformFeePct}% platform fee funds CRM tools, booking infrastructure,
                    and patient analytics that the chain doesn't currently have \u2014 at a fraction of what building it internally would cost.
                  </div>
                </div>

                <div style={{ marginTop: 16, background: "rgba(59,130,246,0.06)", borderRadius: 8, padding: 14, border: "1px solid rgba(59,130,246,0.2)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6", marginBottom: 6 }}>Regulatory advantage</div>
                  <div style={{ fontSize: 11, color: "#a1a1aa", lineHeight: 1.6 }}>
                    Health vouchers in South Africa are unregulated \u2014 they fall outside both medical scheme and
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
              "Your {clinicCount} clinics have {fmtNum(m.emptySlots)} empty slots every month. Let us fill them with voucher patients
              from your 3M records and the uninsured community \u2014 at zero upfront cost. You earn {fmtFull(m.clinicNetPerVoucher)} per
              new visit. We earn only when your patients buy."
            </div>
          </div>
        </>
      )}

      <div style={{ textAlign: "center", padding: "20px 0 8px", borderTop: "1px solid #1a1a1e", marginTop: 24, fontSize: 9, color: "#3f3f46" }}>
        Carewallet Business Case \u00b7 Capacity-Based Model (v2) \u00b7 Clinic Chain Partnership \u00b7 All figures in ZAR \u00b7 March 2026
      </div>
    </div>
  );
}
