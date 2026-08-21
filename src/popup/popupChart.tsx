import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip
} from "chart.js";
import type { TypingSession } from "@shared/types";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const LEVEL_TO_Y: Record<string, number> = { calm: 0, steady: 1, elevated: 2, critical: 3 };

interface PopupChartProps {
  sessions: TypingSession[]; // most-recent-first
}

/** Small sparkline showing the last ~10 sessions' stress trend at a glance. */
export function PopupChart({ sessions }: PopupChartProps) {
  const recent = [...sessions].reverse().slice(-10);

  if (recent.length < 2) {
    return (
      <div className="flex h-16 items-center justify-center text-xs text-slate-400">
        Not enough sessions yet to show a trend
      </div>
    );
  }

  const data = {
    labels: recent.map((_, i) => String(i)),
    datasets: [
      {
        data: recent.map((s) => LEVEL_TO_Y[s.prediction?.level ?? "calm"]),
        borderColor: "#3A5C7A",
        backgroundColor: "rgba(58, 92, 122, 0.12)",
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        borderWidth: 2
      }
    ]
  };

  return (
    <div className="h-16">
      <Line
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { display: false },
            y: { display: false, min: -0.3, max: 3.3 }
          },
          plugins: {
            tooltip: { enabled: false },
            legend: { display: false }
          }
        }}
      />
    </div>
  );
}
