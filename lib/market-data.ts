export type SeriesCode = "LNG_FACTORY_NATIONAL" | "GASOLINE_WHOLESALE_NATIONAL" | "DIESEL_WHOLESALE_NATIONAL";
export type Observation = { seriesCode: SeriesCode; dataDate: string; value: number; unit: "元/吨"; sourceName: string; sourceUrl: string; fetchedAt: string; };
export type DashboardData = { latest: Record<SeriesCode, Observation>; previous: Partial<Record<SeriesCode, Observation>>; history: Observation[]; fetchedAt: string; range: string; };

const dates = ["2026-08-06","2026-08-05","2026-08-04","2026-08-03","2026-07-31","2026-07-30","2026-07-29","2026-07-28","2026-07-27","2026-07-24","2026-07-23","2026-07-22","2026-07-21","2026-07-20","2026-07-17","2026-07-16","2026-07-15","2026-07-14","2026-07-13","2026-07-10","2026-07-09","2026-07-08","2026-07-07"];
const values: Record<SeriesCode, number[]> = {
  LNG_FACTORY_NATIONAL: [5624,5625,5645,5627,5612,5595,5621,5640,5654,5686,5697,5725,5768,5775,5796,5793,5799,5831,5842,5832,5819,5811,5818],
  GASOLINE_WHOLESALE_NATIONAL: [8676,8681,8692,8753,8749,8735,8672,8721,8796,8808,8694,8662,8661,8619,8349,8362,8311,8003,7863,7814,7813,7756,7744],
  DIESEL_WHOLESALE_NATIONAL: [7576,7588,7616,7668,7648,7636,7571,7609,7684,7695,7608,7567,7566,7522,7192,7204,7113,6860,6754,6727,6724,6660,6646],
};
const sourceUrls: Record<SeriesCode, string> = { LNG_FACTORY_NATIONAL: "https://www.shpgx.com/html/qgjg.html", GASOLINE_WHOLESALE_NATIONAL: "https://www.shpgx.com/html/ChnPetrolPrice.html", DIESEL_WHOLESALE_NATIONAL: "https://www.shpgx.com/html/ChnPetrolPrice.html" };
const sourceName = "上海石油天然气交易中心";
const initialFetchedAt = "2026-08-07 15:03";

function seededHistory() { return [{ seriesCode: "LNG_FACTORY_NATIONAL" as const, dataDate: "2026-08-07", value: 5618, unit: "元/吨" as const, sourceName, sourceUrl: sourceUrls.LNG_FACTORY_NATIONAL, fetchedAt: initialFetchedAt }, ...(Object.keys(values) as SeriesCode[]).flatMap((seriesCode) => dates.map((dataDate, index) => ({ seriesCode, dataDate, value: values[seriesCode][index], unit: "元/吨" as const, sourceName, sourceUrl: sourceUrls[seriesCode], fetchedAt: initialFetchedAt })))]; }

export function getDashboardData(): DashboardData {
  const history = seededHistory();
  const sorted = [...history].sort((a,b) => b.dataDate.localeCompare(a.dataDate));
  const codes = Object.keys(values) as SeriesCode[];
  const latest = {} as Record<SeriesCode, Observation>; const previous: Partial<Record<SeriesCode, Observation>> = {};
  for (const code of codes) { const series = sorted.filter(row => row.seriesCode === code); latest[code] = series[0]; previous[code] = series[1]; }
  const datesInData = history.map(row => row.dataDate).sort();
  return { latest, previous, history: sorted, fetchedAt: latest.LNG_FACTORY_NATIONAL?.fetchedAt ?? initialFetchedAt, range: `${datesInData[0]} 至 ${datesInData.at(-1)}` };
}
