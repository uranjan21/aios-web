import { useEffect, useState } from "react";
import { getNextCronRun } from "../lib/cron";
import { Value } from "./agents.styles";

export function NextRunCountdown({ cron, isActive }: { cron: string | null; isActive: boolean }) {
  const [label, setLabel] = useState("—");

  useEffect(() => {
    if (!isActive) {
      setLabel("Paused");
      return;
    }
    if (!cron || cron === "Manual") {
      setLabel("Manual");
      return;
    }

    const tick = () => {
      const next = getNextCronRun(cron);
      if (!next) {
        setLabel("—");
        return;
      }
      const diff = next.getTime() - Date.now();
      if (diff <= 0) {
        setLabel("Now");
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setLabel(hours > 0 ? `${hours}h ${minutes}m` : minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [cron, isActive]);

  return <Value style={{ fontVariantNumeric: "tabular-nums" }}>{label}</Value>;
}
