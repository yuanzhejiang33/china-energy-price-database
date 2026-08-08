import { EnergyDashboard } from "../components/EnergyDashboard";
import { getDashboardData } from "../lib/market-data";

export const dynamic = "force-static";

export default function Home() {
  const data = getDashboardData();
  return <EnergyDashboard initialData={data} />;
}
