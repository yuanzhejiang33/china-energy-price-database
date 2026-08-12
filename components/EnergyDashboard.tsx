"use client";

import { useEffect, useMemo, useState } from "react";
import type { DashboardData, Observation, SeriesCode } from "../lib/market-data";

const labels: Record<SeriesCode, string> = {
  LNG_FACTORY_NATIONAL: "\u4E2D\u56FD LNG \u51FA\u5382\u4EF7\u683C\uFF08\u5168\u56FD\uFF09",
  GASOLINE_WHOLESALE_NATIONAL: "\u4E2D\u56FD\u6C7D\u6CB9\u6279\u53D1\u4EF7\u683C",
  DIESEL_WHOLESALE_NATIONAL: "\u4E2D\u56FD\u67F4\u6CB9\u6279\u53D1\u4EF7\u683C",
};

const seriesOrder: SeriesCode[] = ["LNG_FACTORY_NATIONAL", "GASOLINE_WHOLESALE_NATIONAL", "DIESEL_WHOLESALE_NATIONAL"];

function format(value: number) { return new Intl.NumberFormat("zh-CN").format(value); }
function formatOptional(value: number | undefined) { return value === undefined ? "\u2014" : format(value); }

function toCsv(rows: Observation[]) {
  const dates = [...new Set(rows.map((row) => row.dataDate))].sort().reverse();
  const valuesByDate = new Map(dates.map((date) => [date, new Map<SeriesCode, number>()]));
  rows.forEach((row) => valuesByDate.get(row.dataDate)?.set(row.seriesCode, row.value));
  return "\ufeff\u5B98\u65B9\u53D1\u5E03\u65E5\u671F,LNG\uFF08\u5143/\u5428\uFF09,\u6C7D\u6CB9\uFF08\u5143/\u5428\uFF09,\u67F4\u6CB9\uFF08\u5143/\u5428\uFF09\n" + dates.map((date) => {
    const values = valuesByDate.get(date)!;
    return [date, ...seriesOrder.map((code) => values.get(code) ?? "")].join(",");
  }).join("\n");
}

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function PriceCard({ item, previous, checkedAt, onCopy }: { item: Observation; previous?: Observation; checkedAt: string; onCopy: (text: string) => void }) {
  const change = previous ? item.value - previous.value : 0;
  const percent = previous && previous.value ? (change / previous.value) * 100 : 0;
  const tone = change > 0 ? "up" : change < 0 ? "down" : "flat";
  const marker = change > 0 ? "\u2191" : change < 0 ? "\u2193" : "\u2014";
  const chinaToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
  const checkedToday = checkedAt.startsWith(chinaToday);

  return <article className="price-card">
    <div className="card-label">\u5B98\u65B9\u4EF7\u683C\u6570\u636E</div>
    <h3>{labels[item.seriesCode]}</h3>
    <div className="price-value">{format(item.value)}</div>
    <div className="price-unit">\u5143 / \u5428</div>
    <div className="card-foot"><span>\u5B98\u65B9\u53D1\u5E03\u65E5\u671F\uFF1A{item.dataDate}</span><button className="copy-value" onClick={() => onCopy(`${labels[item.seriesCode]}\uFF1A${item.value} \u5143/\u5428\uFF08${item.dataDate}\uFF09`)}>\u590D\u5236</button></div>
    <div className={`data-status ${checkedToday ? "today" : ""}`}>{item.dataDate === chinaToday ? "\u4ECA\u65E5\u5B98\u65B9\u6570\u636E" : checkedToday ? "\u4ECA\u65E5\u5DF2\u6838\u9A8C\uFF0C\u5B98\u65B9\u6682\u65E0\u66F4\u65B0" : "\u6700\u65B0\u5B98\u65B9\u53D1\u5E03\u6570\u636E"}</div>
    <div className={`change ${tone}`}>{marker} {change === 0 ? "0 \u5143/\u5428\uFF080.00%\uFF09" : `${change > 0 ? "+" : ""}${format(change)} \u5143/\u5428\uFF08${percent > 0 ? "+" : ""}${percent.toFixed(2)}%\uFF09`}</div>
  </article>;
}

function DateFilters({ from, to, setFrom, setTo }: { from: string; to: string; setFrom: (value: string) => void; setTo: (value: string) => void }) {
  return <div className="filters"><label>\u5F00\u59CB\u65E5\u671F <input aria-label="\u5F00\u59CB\u65E5\u671F" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>\u7ED3\u675F\u65E5\u671F <input aria-label="\u7ED3\u675F\u65E5\u671F" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></div>;
}

function mergeUpdates(initialData: DashboardData, updates: Observation[], checkedAt?: string): DashboardData {
  const rows = new Map(initialData.history.map((row) => [`${row.seriesCode}:${row.dataDate}`, row]));
  updates.forEach((row) => rows.set(`${row.seriesCode}:${row.dataDate}`, row));
  const history = [...rows.values()].sort((a, b) => b.dataDate.localeCompare(a.dataDate));
  const latest = {} as Record<SeriesCode, Observation>;
  const previous: Partial<Record<SeriesCode, Observation>> = {};
  seriesOrder.forEach((code) => {
    const series = history.filter((row) => row.seriesCode === code);
    latest[code] = series[0];
    previous[code] = series[1];
  });
  const dates = history.map((row) => row.dataDate).sort();
  return { latest, previous, history, fetchedAt: checkedAt ?? updates.at(-1)?.fetchedAt ?? initialData.fetchedAt, range: `${dates[0]} \u81F3 ${dates.at(-1)}` };
}

export function EnergyDashboard({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState(initialData);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    fetch(`${basePath}/data/updates.json`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload: { observations?: Observation[]; checkedAt?: string } | null) => {
        if (payload?.observations?.length) setData(mergeUpdates(initialData, payload.observations, payload.checkedAt));
      })
      .catch(() => undefined);
  }, [initialData]);

  const filtered = useMemo(() => data.history.filter((row) => (!from || row.dataDate >= from) && (!to || row.dataDate <= to)), [from, to, data.history]);
  const groupedRows = useMemo(() => {
    const grouped = new Map<string, Partial<Record<SeriesCode, number>>>();
    filtered.forEach((row) => grouped.set(row.dataDate, { ...grouped.get(row.dataDate), [row.seriesCode]: row.value }));
    return [...grouped.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);
  const copy = async (text: string) => { await navigator.clipboard.writeText(text); setNotice("\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F"); window.setTimeout(() => setNotice(""), 1600); };

  return <>
    <header className="site-header"><div className="shell header-inner"><div className="brand"><div className="brand-mark">EPD</div><div><h1>\u4E2D\u56FD\u80FD\u6E90\u4EF7\u683C\u6570\u636E\u5E93</h1><p>China Energy Price Database</p></div></div></div></header>
    <main className="shell">
      <section className="intro"><div><h2>\u7ACB\u5373\u8BFB\u53D6\u4E2D\u56FD LNG\u3001\u6C7D\u6CB9\u548C\u67F4\u6CB9\u7684\u5B98\u65B9\u4EF7\u683C\u6570\u5B57\u3002</h2></div><div className="intro-side"><div className="source">\u6570\u636E\u6765\u6E90\uFF1A<strong>SHPGX</strong></div><p className="intro-note">\u4EC5\u6536\u5F55\u5B98\u65B9\u5B9E\u9645\u53D1\u5E03\u65E5\u3002\u975E\u53D1\u5E03\u65E5\u4E0D\u4F1A\u4EE5\u65E7\u4EF7\u683C\u8865\u9F50\u3002</p></div></section>
      <section className="cards" aria-label="\u6700\u65B0\u4EF7\u683C">{seriesOrder.map((code) => <PriceCard key={code} item={data.latest[code]} previous={data.previous[code]} checkedAt={data.fetchedAt} onCopy={copy} />)}</section>
      <p className="verification-note"><strong>\u6700\u8FD1\u6838\u9A8C\uFF1A{data.fetchedAt} CST</strong>\u3002\u4EF7\u683C\u5361\u7684\u201C\u5B98\u65B9\u53D1\u5E03\u65E5\u671F\u201D\u4EC5\u5728 SHPGX \u53D1\u5E03\u65B0\u4EF7\u683C\u65F6\u53D8\u5316\uFF1B\u975E\u53D1\u5E03\u65E5\u4F1A\u663E\u793A\u6700\u8FD1\u4E00\u6B21\u5B98\u65B9\u53D1\u5E03\u503C\u3002</p>
      <section className="tables"><section className="table-section"><div className="section-head"><div><div className="section-kicker">\u5386\u53F2\u5B98\u65B9\u6570\u636E</div><h2>\u80FD\u6E90\u4EF7\u683C\u5386\u53F2\u8BB0\u5F55</h2><p>\u6309\u5B98\u65B9\u53D1\u5E03\u65E5\u671F\u5BF9\u9F50\uFF1B\u6CA1\u6709\u53D1\u5E03\u7684\u54C1\u7C7B\u7559\u7A7A\u3002</p></div><div className="actions"><button className="action" onClick={() => copy(toCsv(filtered))}>\u590D\u5236\u8868\u683C</button><button className="action action-primary" onClick={() => download("china-energy-price-history.csv", toCsv(filtered))}>\u4E0B\u8F7D CSV</button></div></div><DateFilters {...{ from, to, setFrom, setTo }} /><div className="table-wrap"><table><thead><tr><th>\u5B98\u65B9\u53D1\u5E03\u65E5\u671F</th><th className="number">LNG\uFF08\u5143/\u5428\uFF09</th><th className="number">\u6C7D\u6CB9\uFF08\u5143/\u5428\uFF09</th><th className="number">\u67F4\u6CB9\uFF08\u5143/\u5428\uFF09</th></tr></thead><tbody>{groupedRows.map(([date, values]) => <tr key={date}><td>{date}</td><td className="number">{formatOptional(values.LNG_FACTORY_NATIONAL)}</td><td className="number">{formatOptional(values.GASOLINE_WHOLESALE_NATIONAL)}</td><td className="number">{formatOptional(values.DIESEL_WHOLESALE_NATIONAL)}</td></tr>)}</tbody></table>{groupedRows.length === 0 && <div className="empty">\u8FD9\u4E2A\u65E5\u671F\u8303\u56F4\u5185\u6682\u65E0\u5DF2\u53D1\u5E03\u6570\u636E\u3002</div>}</div></section></section>
    </main>
    <footer className="footer"><div className="shell"><strong>\u6570\u636E\u6765\u6E90\uFF1A\u4E0A\u6D77\u77F3\u6CB9\u5929\u7136\u6C14\u4EA4\u6613\u4E2D\u5FC3</strong><p>\u672C\u7F51\u7AD9\u4E3A\u7B2C\u4E09\u65B9\u6570\u636E\u6574\u7406\u5DE5\u5177\uFF0C\u4E0D\u4EE3\u8868\u4E0A\u6D77\u77F3\u6CB9\u5929\u7136\u6C14\u4EA4\u6613\u4E2D\u5FC3\u5B98\u65B9\u7ACB\u573A\u3002\u4EF7\u683C\u53CA\u6307\u6570\u5B9A\u4E49\u4EE5\u539F\u59CB\u53D1\u5E03\u673A\u6784\u4E3A\u51C6\u3002</p><div className="updated">\u6700\u540E\u6210\u529F\u6293\u53D6\u65F6\u95F4\uFF1A{data.fetchedAt} CST \u00B7 \u5F53\u524D\u521D\u59CB\u6570\u636E\u8303\u56F4\uFF1A{data.range}</div></div></footer>{notice && <div className="toast" role="status">{notice}</div>}
  </>;
}

