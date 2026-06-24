export function truncateAddr(addr: string, lead = 6, tail = 4): string {
  if (!addr) return "";
  if (addr.length <= lead + tail + 2) return addr;
  return `${addr.slice(0, lead)}…${addr.slice(-tail)}`;
}

export function formatTs(seconds: number | bigint): string {
  const ms = Number(seconds) * 1000;
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(seconds: number | bigint): string {
  const then = Number(seconds) * 1000;
  if (!Number.isFinite(then) || then <= 0) return "—";
  const delta = Date.now() - then;
  const mins = Math.floor(delta / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
