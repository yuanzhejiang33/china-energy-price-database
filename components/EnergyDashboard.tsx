"use client";

import { useEffect, useMemo, useState } from "react";
import type { DashboardData, Observation, SeriesCode } from "../lib/market-data";

const labels: Record<SeriesCode, string> = {
  LNG_FACTORY_NATIONAL: "中国 LNG 出厂价格（全国）",
  GASOLINE_WHOLESALE_NATIONAL: "中国汽油批发价格",
  DIESEL_WHOLESALE_NATIONAL: "中国柴油批发价格",
};

function format(value: number) { return new Intl.NumberFormat("zh-CN").format(value); }
function toCsv(rows: Observation[], fields: Array<[string, (row: Observation) => string | number]>) {
  return "\ufeff" + [fields.map(([title]) => title).join(","), ...rows.map((row) => fields.map(([, get]) => get(row)).join(","))].join("\n");
}

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}

function PriceCard({ item, previous, onCopy }: { item: Observation; previous?: Observation; onCopy: (text: string) => void }) {
  const change = previous ? item.value - previous.value : 0;
  const percent = previous && previous.value ? (change / previous.value) * 100 : 0;
  const tone = change > 0 ? "up" : change < 0 ? "down" : "flat";
  const mark = change > 0 ? "↑" : change < 0 ? "↓" : "—";
  const chinaToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
  return <article className="price-card">
    <h3>{labels[item.seriesCode]}</h3>
    <div className="price-value">{format(item.value)}</div><div className="price-unit">元 / 吨</div>
    <div className="card-foot"><span>数据日期：{item.dataDate}</span><button className="copy-value" onClick={() => onCopy(`${labels[item.seriesCode]}：${item.value} 元/吨（${item.dataDate}）`)}>复制</button></div>
    <div className={`data-status ${item.dataDate === chinaToday ? "today" : ""}`}>{item.dataDate === chinaToday ? "今日数据" : "最新官方数据"}</div>
    <div className={`change ${tone}`}>{mark} {change === 0 ? "0" : `${change > 0 ? "+" : ""}${format(change)}`} 元/吨 {previous ? `(${percent > 0 ? "+" : ""}${percent.toFixed(2)}%)` : ""}</div>
  </article>;
}

function DateFilters({ from, to, setFrom, setTo }: { from: string; to: string; setFrom: (value: string) => void; setTo: (value: string) => void }) {
  return <div className="filters"><label>开始日期 <input aria-label="开始日期" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label>结束日期 <input aria-label="结束日期" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label></div>;
}

function mergeUpdates(initialData: DashboardData, updates: Observation[]): DashboardData {
  const rows = new Map(initialData.history.map((row) => [`${row.seriesCode}:${row.dataDate}`, row]));
  for (const row of updates) rows.set(`${row.seriesCode}:${row.dataDate}`, row);
  const history = [...rows.values()].sort((a, b) => b.dataDate.localeCompare(a.dataDate));
  const latest = {} as Record<SeriesCode, Observation>;
  const previous: Partial<Record<SeriesCode, Observation>> = {};
  for (const code of Object.keys(initialData.latest) as SeriesCode[]) {
    const series = history.filter((row) => row.seriesCode === code);
    latest[code] = series[0];
    previous[code] = series[1];
  }
  const dates = history.map((row) => row.dataDate).sort();
  return { latest, previous, history, fetchedAt: updates.at(-1)?.fetchedAt ?? initialData.fetchedAt, range: `${dates[0]} 至 ${dates.at(-1)}` };
}

export function EnergyDashboard({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState(initialData); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [notice, setNotice] = useState("");
  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    fetch(`${basePath}/data/updates.json`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload: { observations?: Observation[] } | null) => {
        if (payload?.observations?.length) setData(mergeUpdates(initialData, payload.observations));
      })
      .catch(() => undefined);
  }, [initialData]);
  const filtered = useMemo(() => data.history.filter((row) => (!from || row.dataDate >= from) && (!to || row.dataDate <= to)), [from, to, data.history]);
  const copy = async (text: string) => { await navigator.clipboard.writeText(text); setNotice("已复制到剪贴板"); window.setTimeout(() => setNotice(""), 1600); };
  const lng = filtered.filter((row) => row.seriesCode === "LNG_FACTORY_NATIONAL");
  const fuel = filtered.filter((row) => row.seriesCode !== "LNG_FACTORY_NATIONAL");
  const latestOrder: SeriesCode[] = ["LNG_FACTORY_NATIONAL", "GASOLINE_WHOLESALE_NATIONAL", "DIESEL_WHOLESALE_NATIONAL"];
  return <>
    <header className="site-header"><div className="shell header-inner"><div className="brand"><div className="brand-mark">EPD</div><div><h1>中国能源价格数据库</h1><p>China Energy Price Database</p></div></div><div className="source">数据来源：<strong>SHPGX</strong></div></div></header>
    <main className="shell"><section className="intro"><div><div className="eyebrow">Structured official price data</div><h2>打开网页，立即读取中国 LNG、汽油和柴油的官方价格数字。</h2></div><p className="intro-note">仅收录官方实际发布日。非发布日不会以旧价格补齐。</p></section>
    <section className="cards" aria-label="最新价格">{latestOrder.map((code) => <PriceCard key={code} item={data.latest[code]} previous={data.previous[code]} onCopy={copy} />)}</section>
    <section className="tables"><section className="table-section"><div className="section-head"><div><h2>LNG 历史价格</h2><p>中国 LNG 出厂价格（全国） · 元/吨</p></div><div className="actions"><button className="action" onClick={() => copy(toCsv(lng, [["date", r => r.dataDate], ["lng_factory_price_yuan_per_ton", r => r.value]]))}>复制表格</button><button className="action" onClick={() => download("lng-history.csv", toCsv(lng, [["date", r => r.dataDate], ["lng_factory_price_yuan_per_ton", r => r.value]]))}>下载 CSV</button></div></div><DateFilters {...{ from, to, setFrom, setTo }} /><div className="table-wrap"><table><thead><tr><th>数据日期</th><th className="number">价格（元/吨）</th></tr></thead><tbody>{lng.map((r) => <tr key={`${r.seriesCode}-${r.dataDate}`}><td>{r.dataDate}</td><td className="number">{format(r.value)}</td></tr>)}</tbody></table>{lng.length === 0 && <div className="empty">这个日期范围内暂无已发布数据。</div>}</div></section>
    <section className="table-section"><div className="section-head"><div><h2>汽柴油历史价格</h2><p>中国汽油、柴油批发价格 · 元/吨</p></div><div className="actions"><button className="action" onClick={() => copy(toCsv(fuel, [["date", r => r.dataDate], ["series", r => r.seriesCode], ["price_yuan_per_ton", r => r.value]]))}>复制表格</button><button className="action" onClick={() => download("fuel-history.csv", toCsv(fuel, [["date", r => r.dataDate], ["series", r => r.seriesCode], ["price_yuan_per_ton", r => r.value]]))}>下载 CSV</button></div></div><DateFilters {...{ from, to, setFrom, setTo }} /><div className="table-wrap"><table><thead><tr><th>数据日期</th><th className="number">汽油（元/吨）</th><th className="number">柴油（元/吨）</th></tr></thead><tbody>{Array.from(new Set(fuel.map(r => r.dataDate))).map((date) => { const rows = fuel.filter(r => r.dataDate === date); return <tr key={date}><td>{date}</td><td className="number">{format(rows.find(r => r.seriesCode === "GASOLINE_WHOLESALE_NATIONAL")?.value ?? 0)}</td><td className="number">{format(rows.find(r => r.seriesCode === "DIESEL_WHOLESALE_NATIONAL")?.value ?? 0)}</td></tr>; })}</tbody></table>{fuel.length === 0 && <div className="empty">这个日期范围内暂无已发布数据。</div>}</div></section></section></main>
    <footer className="footer"><div className="shell"><strong>数据来源：上海石油天然气交易中心</strong><p>本网站为第三方数据整理工具，不代表上海石油天然气交易中心官方立场。价格及指数定义以原始发布机构为准。</p><div className="updated">最后成功抓取时间：{data.fetchedAt} CST · 当前初始数据范围：{data.range}</div></div></footer>{notice && <div className="toast" role="status">{notice}</div>}
  </>;
}
