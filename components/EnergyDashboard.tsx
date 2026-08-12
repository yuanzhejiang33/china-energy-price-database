"use client";

import { useEffect, useMemo, useState } from "react";
import type { DashboardData, Observation, SeriesCode } from "../lib/market-data";

const T = {
  lng: "\u4e2d\u56fd LNG \u51fa\u5382\u4ef7\u683c\uff08\u5168\u56fd\uff09",
  gasoline: "\u4e2d\u56fd\u6c7d\u6cb9\u6279\u53d1\u4ef7\u683c",
  diesel: "\u4e2d\u56fd\u67f4\u6cb9\u6279\u53d1\u4ef7\u683c",
  officialData: "\u5b98\u65b9\u4ef7\u683c\u6570\u636e",
  yuanPerTon: "\u5143 / \u5428",
  officialDate: "\u5b98\u65b9\u53d1\u5e03\u65e5\u671f\uff1a",
  copy: "\u590d\u5236",
  todayData: "\u4eca\u65e5\u5b98\u65b9\u6570\u636e",
  checkedToday: "\u4eca\u65e5\u5df2\u6838\u9a8c\uff0c\u5b98\u65b9\u6682\u65e0\u66f4\u65b0",
  latestData: "\u6700\u65b0\u5b98\u65b9\u53d1\u5e03\u6570\u636e",
  start: "\u5f00\u59cb\u65e5\u671f",
  end: "\u7ed3\u675f\u65e5\u671f",
  copied: "\u5df2\u590d\u5236\u5230\u526a\u8d34\u677f",
  title: "\u4e2d\u56fd\u80fd\u6e90\u4ef7\u683c\u6570\u636e\u5e93",
  hero: "\u5feb\u901f\u83b7\u53d6\u4e2d\u56fdLNG\u548c\u6c7d\u67f4\u6cb9\u4ef7\u683c",
  source: "\u6570\u636e\u6765\u6e90\uff1a",
  note: "\u4ec5\u6536\u5f55\u5b98\u65b9\u5b9e\u9645\u53d1\u5e03\u65e5\u3002\u975e\u53d1\u5e03\u65e5\u4e0d\u4f1a\u4ee5\u65e7\u4ef7\u683c\u8865\u9f50\u3002",
  latestPrice: "\u6700\u65b0\u4ef7\u683c",
  verified: "\u6700\u8fd1\u6838\u9a8c\uff1a",
  verificationTail: "\u3002\u4ef7\u683c\u5361\u7684\u201c\u5b98\u65b9\u53d1\u5e03\u65e5\u671f\u201d\u4ec5\u5728 SHPGX \u53d1\u5e03\u65b0\u4ef7\u683c\u65f6\u53d8\u5316\uff1b\u975e\u53d1\u5e03\u65e5\u4f1a\u663e\u793a\u6700\u8fd1\u4e00\u6b21\u5b98\u65b9\u53d1\u5e03\u503c\u3002",
  historyTitle: "\u80fd\u6e90\u5386\u53f2\u4ef7\u683c",
  historyNote: "\u6309\u5b98\u65b9\u53d1\u5e03\u65e5\u671f\u5bf9\u9f50\uff1b\u6ca1\u6709\u53d1\u5e03\u7684\u54c1\u7c7b\u7559\u7a7a\u3002",
  copyTable: "\u590d\u5236\u8868\u683c",
  download: "\u4e0b\u8f7d CSV",
  empty: "\u8fd9\u4e2a\u65e5\u671f\u8303\u56f4\u5185\u6682\u65e0\u5df2\u53d1\u5e03\u6570\u636e\u3002",
  shanghai: "\u6570\u636e\u6765\u6e90\uff1a\u4e0a\u6d77\u77f3\u6cb9\u5929\u7136\u6c14\u4ea4\u6613\u4e2d\u5fc3",
  disclaimer: "\u672c\u7f51\u7ad9\u4e3a\u7b2c\u4e09\u65b9\u6570\u636e\u6574\u7406\u5de5\u5177\uff0c\u4e0d\u4ee3\u8868\u4e0a\u6d77\u77f3\u6cb9\u5929\u7136\u6c14\u4ea4\u6613\u4e2d\u5fc3\u5b98\u65b9\u7acb\u573a\u3002\u4ef7\u683c\u53ca\u6307\u6570\u5b9a\u4e49\u4ee5\u539f\u59cb\u53d1\u5e03\u673a\u6784\u4e3a\u51c6\u3002",
  fetched: "\u6700\u540e\u6210\u529f\u6293\u53d6\u65f6\u95f4\uff1a",
  range: "\u5f53\u524d\u521d\u59cb\u6570\u636e\u8303\u56f4\uff1a",
  date: "\u5b98\u65b9\u53d1\u5e03\u65e5\u671f",
  lngColumn: "LNG\uff08\u5143/\u5428\uff09",
  gasolineColumn: "\u6c7d\u6cb9\uff08\u5143/\u5428\uff09",
  dieselColumn: "\u67f4\u6cb9\uff08\u5143/\u5428\uff09",
};

const labels: Record<SeriesCode, string> = {
  LNG_FACTORY_NATIONAL: T.lng,
  GASOLINE_WHOLESALE_NATIONAL: T.gasoline,
  DIESEL_WHOLESALE_NATIONAL: T.diesel,
};
const seriesOrder: SeriesCode[] = ["LNG_FACTORY_NATIONAL", "GASOLINE_WHOLESALE_NATIONAL", "DIESEL_WHOLESALE_NATIONAL"];

function format(value: number) { return new Intl.NumberFormat("zh-CN").format(value); }
function formatOptional(value: number | undefined) { return value === undefined ? "\u2014" : format(value); }

function toCsv(rows: Observation[]) {
  const dates = [...new Set(rows.map((row) => row.dataDate))].sort().reverse();
  const values = new Map(dates.map((date) => [date, new Map<SeriesCode, number>()]));
  rows.forEach((row) => values.get(row.dataDate)?.set(row.seriesCode, row.value));
  return `\ufeff${T.date},${T.lngColumn},${T.gasolineColumn},${T.dieselColumn}\n` + dates.map((date) => [date, ...seriesOrder.map((code) => values.get(date)?.get(code) ?? "")].join(",")).join("\n");
}

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}

function PriceCard({ item, previous, checkedAt, onCopy }: { item: Observation; previous?: Observation; checkedAt: string; onCopy: (text: string) => void }) {
  const change = previous ? item.value - previous.value : 0;
  const percent = previous && previous.value ? (change / previous.value) * 100 : 0;
  const tone = change > 0 ? "up" : change < 0 ? "down" : "flat";
  const marker = change > 0 ? "\u2191" : change < 0 ? "\u2193" : "\u2014";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
  const checkedToday = checkedAt.startsWith(today);
  const status = item.dataDate === today ? T.todayData : checkedToday ? T.checkedToday : T.latestData;
  const changeText = change === 0 ? `0 ${T.yuanPerTon}\uff080.00%\uff09` : `${change > 0 ? "+" : ""}${format(change)} ${T.yuanPerTon}\uff08${percent > 0 ? "+" : ""}${percent.toFixed(2)}%\uff09`;
  return <article className="price-card"><div className="card-label">{T.officialData}</div><h3>{labels[item.seriesCode]}</h3><div className="price-value">{format(item.value)}</div><div className="price-unit">{T.yuanPerTon}</div><div className="card-foot"><span>{T.officialDate}{item.dataDate}</span><button className="copy-value" onClick={() => onCopy(`${labels[item.seriesCode]}\uff1a${item.value} ${T.yuanPerTon}\uff08${item.dataDate}\uff09`)}>{T.copy}</button></div><div className={`data-status ${checkedToday ? "today" : ""}`}>{status}</div><div className={`change ${tone}`}>{marker} {changeText}</div></article>;
}

function DateFilters({ from, to, setFrom, setTo }: { from: string; to: string; setFrom: (value: string) => void; setTo: (value: string) => void }) {
  return <div className="filters"><label>{T.start}<input aria-label={T.start} type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>{T.end}<input aria-label={T.end} type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></div>;
}

function mergeUpdates(initial: DashboardData, updates: Observation[], checkedAt?: string): DashboardData {
  const all = new Map(initial.history.map((row) => [`${row.seriesCode}:${row.dataDate}`, row]));
  updates.forEach((row) => all.set(`${row.seriesCode}:${row.dataDate}`, row));
  const history = [...all.values()].sort((a, b) => b.dataDate.localeCompare(a.dataDate));
  const latest = {} as Record<SeriesCode, Observation>; const previous: Partial<Record<SeriesCode, Observation>> = {};
  seriesOrder.forEach((code) => { const rows = history.filter((row) => row.seriesCode === code); latest[code] = rows[0]; previous[code] = rows[1]; });
  const dates = history.map((row) => row.dataDate).sort();
  return { latest, previous, history, fetchedAt: checkedAt ?? updates.at(-1)?.fetchedAt ?? initial.fetchedAt, range: `${dates[0]} \u81f3 ${dates.at(-1)}` };
}

export function EnergyDashboard({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState(initialData); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [notice, setNotice] = useState("");
  useEffect(() => { const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""; fetch(`${basePath}/data/updates.json`, { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((payload: { observations?: Observation[]; checkedAt?: string } | null) => { if (payload?.observations?.length) setData(mergeUpdates(initialData, payload.observations, payload.checkedAt)); }).catch(() => undefined); }, [initialData]);
  const filtered = useMemo(() => data.history.filter((row) => row.dataDate >= "2026-08-06" && (!from || row.dataDate >= from) && (!to || row.dataDate <= to)), [from, to, data.history]);
  const grouped = useMemo(() => { const rows = new Map<string, Partial<Record<SeriesCode, number>>>(); filtered.forEach((row) => rows.set(row.dataDate, { ...rows.get(row.dataDate), [row.seriesCode]: row.value })); return [...rows.entries()].sort(([a], [b]) => b.localeCompare(a)); }, [filtered]);
  const copy = async (value: string) => { await navigator.clipboard.writeText(value); setNotice(T.copied); window.setTimeout(() => setNotice(""), 1600); };
  return <><header className="site-header"><div className="shell header-inner"><div className="brand"><div className="brand-mark" aria-label="Energy Price Database">EPD</div><div><h1>{T.title}</h1></div></div></div></header><main className="shell"><section className="intro"><div><h2>{T.hero}</h2></div><div className="intro-side"><div className="source">{T.source}<strong>SHPGX</strong></div><p className="intro-note">{T.note}</p></div></section><section className="cards" aria-label={T.latestPrice}>{seriesOrder.map((code) => <PriceCard key={code} item={data.latest[code]} previous={data.previous[code]} checkedAt={data.fetchedAt} onCopy={copy} />)}</section><p className="verification-note"><strong>{T.verified}{data.fetchedAt} CST</strong>{T.verificationTail}</p><section className="tables"><section className="table-section"><div className="section-head"><div><h2>{T.historyTitle}</h2><p>{T.historyNote}</p></div><div className="actions"><button className="action" onClick={() => copy(toCsv(filtered))}>{T.copyTable}</button><button className="action" onClick={() => download("china-energy-price-history.csv", toCsv(filtered))}>{T.download}</button></div></div><DateFilters {...{ from, to, setFrom, setTo }} /><div className="table-wrap"><table><thead><tr><th>{T.date}</th><th className="number">{T.lngColumn}</th><th className="number">{T.gasolineColumn}</th><th className="number">{T.dieselColumn}</th></tr></thead><tbody>{grouped.map(([date, values]) => <tr key={date}><td>{date}</td><td className="number">{formatOptional(values.LNG_FACTORY_NATIONAL)}</td><td className="number">{formatOptional(values.GASOLINE_WHOLESALE_NATIONAL)}</td><td className="number">{formatOptional(values.DIESEL_WHOLESALE_NATIONAL)}</td></tr>)}</tbody></table>{grouped.length === 0 && <div className="empty">{T.empty}</div>}</div></section></section></main><footer className="footer"><div className="shell"><strong>{T.shanghai}</strong><p>{T.disclaimer}</p><div className="updated">{T.fetched}{data.fetchedAt} CST \u00b7 {T.range}{data.range}</div></div></footer>{notice && <div className="toast" role="status">{notice}</div>}</>;
}

