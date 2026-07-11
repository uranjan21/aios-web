// Cron schedule helpers for the Agents page — pure functions, no UI deps.

/** Human-readable label for a 5-field cron string (or "Manual"). */
export function formatScheduleLabel(cron: string | null, isActive: boolean): { title: string; subtitle: string } {
  if (!cron || cron === "Manual") {
    return {
      title: "Manual only",
      subtitle: isActive ? "Run on demand" : "Paused",
    };
  }

  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) {
    return { title: cron, subtitle: "Custom schedule" };
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const minuteNum = Number(minute);
  const hourNum = Number(hour);
  const timeLabel =
    Number.isFinite(minuteNum) && Number.isFinite(hourNum)
      ? new Intl.DateTimeFormat(undefined, {
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date(2026, 0, 1, hourNum, minuteNum))
      : "Custom";

  if (dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return { title: "Every day", subtitle: timeLabel };
  }

  if (dayOfMonth === "*" && month === "*" && dayOfWeek !== "*") {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return {
      title: days[Number(dayOfWeek)] ? `Every ${days[Number(dayOfWeek)]}` : "Weekly",
      subtitle: timeLabel,
    };
  }

  if (dayOfMonth !== "*" && month === "*") {
    return {
      title: `Day ${dayOfMonth} monthly`,
      subtitle: timeLabel,
    };
  }

  return {
    title: "Custom cadence",
    subtitle: timeLabel,
  };
}

/** True if a single cron field (wildcard, step, or literal) matches a value. */
function matchField(field: string, val: number): boolean {
  if (field === "*") return true;
  if (field.startsWith("*/")) return val % Number(field.slice(2)) === 0;
  return Number(field) === val;
}

/** Next fire time for a cron string, scanning forward up to 45 days. Null if unparseable. */
export function getNextCronRun(cron: string): Date | null {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [minute, hour, dom, month, dow] = parts;

  const next = new Date();
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() + 1);

  for (let i = 0; i < 64800; i++) {
    if (
      matchField(month, next.getMonth() + 1) &&
      matchField(dom, next.getDate()) &&
      matchField(dow, next.getDay()) &&
      matchField(hour, next.getHours()) &&
      matchField(minute, next.getMinutes())
    ) {
      return new Date(next);
    }
    next.setMinutes(next.getMinutes() + 1);
  }

  return null;
}

/**
 * Sort key for schedule ordering. Scans from the START of today so today's
 * morning agents sort before today's evening agents regardless of current time.
 */
export function getScheduleSortValue(cron: string): number {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return Infinity;
  const [minute, hour, dom, month, dow] = parts;

  const next = new Date();
  next.setHours(0, 0, 0, 0);

  for (let i = 0; i < 64800; i++) {
    if (
      matchField(month, next.getMonth() + 1) &&
      matchField(dom, next.getDate()) &&
      matchField(dow, next.getDay()) &&
      matchField(hour, next.getHours()) &&
      matchField(minute, next.getMinutes())
    ) {
      return next.getTime();
    }
    next.setMinutes(next.getMinutes() + 1);
  }

  return Infinity;
}
