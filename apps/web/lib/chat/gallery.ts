import { inflationChart, servicePointsDonut } from "./artifacts";
import type { TableArtifact } from "./types";

export const inflationArea: TableArtifact = {
  ...inflationChart,
  id: "inflation-area-demo",
  title: "Inflation annuelle en Haïti · aire",
  decision: { ...inflationChart.decision, chartType: "area" },
};

export const agenciesPie: TableArtifact = {
  ...servicePointsDonut,
  id: "agencies-pie-demo",
  title: "Agences complètes · camembert",
  decision: { ...servicePointsDonut.decision, chartType: "pie" },
};

export const agenciesBar: TableArtifact = {
  ...servicePointsDonut,
  id: "agencies-bar-demo",
  title: "Agences complètes · barres",
  decision: { ...servicePointsDonut.decision, chartType: "bar" },
};

export const chartGallery = [inflationArea, agenciesPie, agenciesBar];
