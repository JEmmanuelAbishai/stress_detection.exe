import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import type { DailyReport } from "@shared/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler
);

const AXIS_COLOR = "#7B93A0";
const GRID_COLOR = "#E7EEF0";

interface TrendChartProps {
  reports: DailyReport[]; // sorted ascending by date
}

export function StressTrendChart({ reports }: TrendChartProps) {
  const data = {
    labels: reports.map((r) => r.date.slice(5)), // MM-DD
    datasets: [
      {
        label: "Avg. stress score",
        data: reports.map((r) => r.avgScore),
        borderColor: "#3A5C7A",
        backgroundColor: "rgba(58, 92, 122, 0.08)",
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: "#3A5C7A"
      }
    ]
  };

  return (
    <Line
      data={data}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }, ticks: { color: AXIS_COLOR } },
          y: {
            min: 0,
            max: 1,
            grid: { color: GRID_COLOR },
            ticks: { color: AXIS_COLOR }
          }
        },
        plugins: { legend: { display: false } }
      }}
    />
  );
}

interface LevelBreakdownChartProps {
  reports: DailyReport[];
}

export function LevelBreakdownChart({ reports }: LevelBreakdownChartProps) {
  const data = {
    labels: reports.map((r) => r.date.slice(5)),
    datasets: [
      { label: "Calm", data: reports.map((r) => r.levelCounts.calm), backgroundColor: "#3FA796" },
      { label: "Steady", data: reports.map((r) => r.levelCounts.steady), backgroundColor: "#E7B23A" },
      { label: "Elevated", data: reports.map((r) => r.levelCounts.elevated), backgroundColor: "#D9704F" },
      { label: "Critical", data: reports.map((r) => r.levelCounts.critical), backgroundColor: "#B3413A" }
    ]
  };

  return (
    <Bar
      data={data}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { color: AXIS_COLOR } },
          y: { stacked: true, grid: { color: GRID_COLOR }, ticks: { color: AXIS_COLOR } }
        },
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 10, color: "#1F2933" } }
        }
      }}
    />
  );
}

interface DomainBarChartProps {
  domains: { domain: string; count: number }[];
}

export function DomainBarChart({ domains }: DomainBarChartProps) {
  const data = {
    labels: domains.map((d) => d.domain),
    datasets: [
      {
        label: "Sessions",
        data: domains.map((d) => d.count),
        backgroundColor: "#7B93A0"
      }
    ]
  };

  return (
    <Bar
      data={data}
      options={{
        indexAxis: "y" as const,
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { color: GRID_COLOR }, ticks: { color: AXIS_COLOR } },
          y: { grid: { display: false }, ticks: { color: AXIS_COLOR } }
        },
        plugins: { legend: { display: false } }
      }}
    />
  );
}
