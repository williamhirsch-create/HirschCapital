import { Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Bar, CartesianGrid, Line } from "recharts";

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0C0F14", color: "#fff", padding: "10px 14px", borderRadius: 10, fontSize: 13, fontFamily: "'DM Sans'", boxShadow: "0 8px 32px rgba(0,0,0,.3)" }}>
      <div style={{ color: "#9CA3AF", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || "#00C48C", fontWeight: 600 }}>
          {p.name}: {typeof p.value === "number" ? (p.name === "volume" ? (p.value / 1e6).toFixed(1) + "M" : "$" + p.value.toFixed(2)) : p.value}
        </div>
      ))}
    </div>
  );
};

export default function PriceChart({ cc, tf, catColor }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={cc} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <defs>
          <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={catColor} stopOpacity={0.12} />
            <stop offset="100%" stopColor={catColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
        <XAxis dataKey={tf === "1D" ? "time" : "date"} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} interval={tf === "1D" ? 12 : "preserveStartEnd"} />
        <YAxis domain={["auto", "auto"]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} tickFormatter={(v) => `$${v.toFixed(v < 10 ? 2 : 0)}`} width={55} />
        <Tooltip content={<Tip />} />
        <Area type="monotone" dataKey="price" stroke={catColor} strokeWidth={2.5} fill="url(#pg)" dot={false} name="price" />
        {tf === "1D" && <Line type="monotone" dataKey="vwap" stroke="var(--am)" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="VWAP" />}
        <Bar dataKey="volume" fill={`${catColor}15`} yAxisId="vol" name="volume" />
        <YAxis yAxisId="vol" orientation="right" hide domain={[0, (d) => d * 5]} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
