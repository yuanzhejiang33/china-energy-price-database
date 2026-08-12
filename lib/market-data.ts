export type SeriesCode = "LNG_FACTORY_NATIONAL" | "GASOLINE_WHOLESALE_NATIONAL" | "DIESEL_WHOLESALE_NATIONAL";
export type Observation = { seriesCode: SeriesCode; dataDate: string; value: number; unit: "???/???"; sourceName: string; sourceUrl: string; fetchedAt: string; };
export type DashboardData = { latest: Record<SeriesCode, Observation>; previous: Partial<Record<SeriesCode, Observation>>; history: Observation[]; fetchedAt: string; range: string; };

const dates = ["2026-08-06"];
const values: Record<SeriesCode, number[]> = {
  LNG_FACTORY_NATIONAL: [5624],
  GASOLINE_WHOLESALE_NATIONAL: [8676],
  DIESEL_WHOLESALE_NATIONAL: [7576],
};
const sourceUrls: Record<SeriesCode, string> = { LNG_FACTORY_NATIONAL: "https://www.shpgx.com/html/qgjg.html", GASOLINE_WHOLESALE_NATIONAL: "https://www.shpgx.com/html/ChnPetrolPrice.html", DIESEL_WHOLESALE_NATIONAL: "https://www.shpgx.com/html/ChnPetrolPrice.html" };
const sourceName = "?????????????????????????????????";
const initialFetchedAt = "2026-08-07 15:03";

function seededHistory() { return [{ seriesCode: "LNG_FACTORY_NATIONAL" as const, dataDate: "2026-08-07", value: 5618, unit: "???/???" as const, sourceName, sourceUrl: sourceUrls.LNG_FACTORY_NATIONAL, fetchedAt: initialFetchedAt }, ...(Object.keys(values) as SeriesCode[]).flatMap((seriesCode) => dates.map((dataDate, index) => ({ seriesCode, dataDate, value: values[seriesCode][index], unit: "???/???" as const, sourceName, sourceUrl: sourceUrls[seriesCode], fetchedAt: initialFetchedAt })))]; }

export function getDashboardData(): DashboardData {
  const history = seededHistory();
  const sorted = [...history].sort((a,b) => b.dataDate.localeCompare(a.dataDate));
  const codes = Object.keys(values) as SeriesCode[];
  const latest = {} as Record<SeriesCode, Observation>; const previous: Partial<Record<SeriesCode, Observation>> = {};
  for (const code of codes) { const series = sorted.filter(row => row.seriesCode === code); latest[code] = series[0]; previous[code] = series[1]; }
  const datesInData = history.map(row => row.dataDate).sort();
  return { latest, previous, history: sorted, fetchedAt: latest.LNG_FACTORY_NATIONAL?.fetchedAt ?? initialFetchedAt, range: `${datesInData[0]} ??? ${datesInData.at(-1)}` };
}

