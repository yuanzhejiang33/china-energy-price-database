"use client";

import { useEffect, useMemo, useState } from "react";
import type { DashboardData, Observation, SeriesCode } from "../lib/market-data";

const labels: Record<SeriesCode, string> = {
  LNG_FACTORY_NATIONAL: "涓浗 LNG 鍑哄巶浠锋牸锛堝叏鍥斤級",
  GASOLINE_WHOLESALE_NATIONAL: "涓浗姹芥补鎵瑰彂浠锋牸",
  DIESEL_WHOLESALE_NATIONAL: "涓浗鏌存补鎵瑰彂浠锋牸",
};

const seriesOrder: SeriesCode[] = ["LNG_FACTORY_NATIONAL", "GASOLINE_WHOLESALE_NATIONAL", "DIESEL_WHOLESALE_NATIONAL"];

function format(value: number) { return new Intl.NumberFormat("zh-CN").format(value); }
function formatOptional(value: number | undefined) { return value === undefined ? "鈥? : format(value); }

function toCsv(rows: Observation[]) {
  const dates = [...new Set(rows.map((row) => row.dataDate))].sort().reverse();
  const valuesByDate = new Map(dates.map((date) => [date, new Map<SeriesCode, number>()]));
  rows.forEach((row) => valuesByDate.get(row.dataDate)?.set(row.seriesCode, row.value));
  return "\ufeff瀹樻柟鍙戝竷鏃ユ湡,LNG锛堝厓/鍚級,姹芥补锛堝厓/鍚級,鏌存补锛堝厓/鍚級\n" + dates.map((date) => {
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
  const marker = change > 0 ? "鈫? : change < 0 ? "鈫? : "鈥?;
  const chinaToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
  const checkedToday = checkedAt.startsWith(chinaToday);

  return <article className="price-card">
    <div className="card-label">瀹樻柟浠锋牸鏁版嵁</div>
    <h3>{labels[item.seriesCode]}</h3>
    <div className="price-value">{format(item.value)}</div>
    <div className="price-unit">鍏?/ 鍚?/div>
    <div className="card-foot"><span>瀹樻柟鍙戝竷鏃ユ湡锛歿item.dataDate}</span><button className="copy-value" onClick={() => onCopy(`${labels[item.seriesCode]}锛?{item.value} 鍏?鍚紙${item.dataDate}锛塦)}>澶嶅埗</button></div>
    <div className={`data-status ${checkedToday ? "today" : ""}`}>{item.dataDate === chinaToday ? "浠婃棩瀹樻柟鏁版嵁" : checkedToday ? "浠婃棩宸叉牳楠岋紝瀹樻柟鏆傛棤鏇存柊" : "鏈€鏂板畼鏂瑰彂甯冩暟鎹?}</div>
    <div className={`change ${tone}`}>{marker} {change === 0 ? "0 鍏?鍚紙0.00%锛? : `${change > 0 ? "+" : ""}${format(change)} 鍏?鍚紙${percent > 0 ? "+" : ""}${percent.toFixed(2)}%锛塦}</div>
  </article>;
}

function DateFilters({ from, to, setFrom, setTo }: { from: string; to: string; setFrom: (value: string) => void; setTo: (value: string) => void }) {
  return <div className="filters"><label>寮€濮嬫棩鏈?<input aria-label="寮€濮嬫棩鏈? type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>缁撴潫鏃ユ湡 <input aria-label="缁撴潫鏃ユ湡" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></div>;
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
  return { latest, previous, history, fetchedAt: checkedAt ?? updates.at(-1)?.fetchedAt ?? initialData.fetchedAt, range: `${dates[0]} 鑷?${dates.at(-1)}` };
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
  const copy = async (text: string) => { await navigator.clipboard.writeText(text); setNotice("宸插鍒跺埌鍓创鏉?); window.setTimeout(() => setNotice(""), 1600); };

  return <>
    <header className="site-header"><div className="shell header-inner"><div className="brand"><div className="brand-mark">EPD</div><div><h1>涓浗鑳芥簮浠锋牸鏁版嵁搴?/h1><p>China Energy Price Database</p></div></div></div></header>
    <main className="shell">
      <section className="intro"><div><h2>绔嬪嵆璇诲彇涓浗 LNG銆佹苯娌瑰拰鏌存补鐨勫畼鏂逛环鏍兼暟瀛椼€?/h2></div><div className="intro-side"><div className="source">鏁版嵁鏉ユ簮锛?strong>SHPGX</strong></div><p className="intro-note">浠呮敹褰曞畼鏂瑰疄闄呭彂甯冩棩銆傞潪鍙戝竷鏃ヤ笉浼氫互鏃т环鏍艰ˉ榻愩€?/p></div></section>
      <section className="cards" aria-label="鏈€鏂颁环鏍?>{seriesOrder.map((code) => <PriceCard key={code} item={data.latest[code]} previous={data.previous[code]} checkedAt={data.fetchedAt} onCopy={copy} />)}</section>
      <p className="verification-note"><strong>鏈€杩戞牳楠岋細{data.fetchedAt} CST</strong>銆備环鏍煎崱鐨勨€滃畼鏂瑰彂甯冩棩鏈熲€濅粎鍦?SHPGX 鍙戝竷鏂颁环鏍兼椂鍙樺寲锛涢潪鍙戝竷鏃ヤ細鏄剧ず鏈€杩戜竴娆″畼鏂瑰彂甯冨€笺€?/p>
      <section className="tables"><section className="table-section"><div className="section-head"><div><div className="section-kicker">鍘嗗彶瀹樻柟鏁版嵁</div><h2>鑳芥簮浠锋牸鍘嗗彶璁板綍</h2><p>鎸夊畼鏂瑰彂甯冩棩鏈熷榻愶紱娌℃湁鍙戝竷鐨勫搧绫荤暀绌恒€?/p></div><div className="actions"><button className="action" onClick={() => copy(toCsv(filtered))}>澶嶅埗琛ㄦ牸</button><button className="action action-primary" onClick={() => download("china-energy-price-history.csv", toCsv(filtered))}>涓嬭浇 CSV</button></div></div><DateFilters {...{ from, to, setFrom, setTo }} /><div className="table-wrap"><table><thead><tr><th>瀹樻柟鍙戝竷鏃ユ湡</th><th className="number">LNG锛堝厓/鍚級</th><th className="number">姹芥补锛堝厓/鍚級</th><th className="number">鏌存补锛堝厓/鍚級</th></tr></thead><tbody>{groupedRows.map(([date, values]) => <tr key={date}><td>{date}</td><td className="number">{formatOptional(values.LNG_FACTORY_NATIONAL)}</td><td className="number">{formatOptional(values.GASOLINE_WHOLESALE_NATIONAL)}</td><td className="number">{formatOptional(values.DIESEL_WHOLESALE_NATIONAL)}</td></tr>)}</tbody></table>{groupedRows.length === 0 && <div className="empty">杩欎釜鏃ユ湡鑼冨洿鍐呮殏鏃犲凡鍙戝竷鏁版嵁銆?/div>}</div></section></section>
    </main>
    <footer className="footer"><div className="shell"><strong>鏁版嵁鏉ユ簮锛氫笂娴风煶娌瑰ぉ鐒舵皵浜ゆ槗涓績</strong><p>鏈綉绔欎负绗笁鏂规暟鎹暣鐞嗗伐鍏凤紝涓嶄唬琛ㄤ笂娴风煶娌瑰ぉ鐒舵皵浜ゆ槗涓績瀹樻柟绔嬪満銆備环鏍煎強鎸囨暟瀹氫箟浠ュ師濮嬪彂甯冩満鏋勪负鍑嗐€?/p><div className="updated">鏈€鍚庢垚鍔熸姄鍙栨椂闂达細{data.fetchedAt} CST 路 褰撳墠鍒濆鏁版嵁鑼冨洿锛歿data.range}</div></div></footer>{notice && <div className="toast" role="status">{notice}</div>}
  </>;
}

