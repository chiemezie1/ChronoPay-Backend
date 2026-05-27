type Slot = {
  id: number;
  professional: string;
  startTime: number;
  endTime: number;
};

// Create a deterministic in-memory list of slots for testing/demo purposes.
const SLOTS: Slot[] = Array.from({ length: 250 }).map((_, i) => {
  const start = 1000 + i * 60;
  return {
    id: i + 1,
    professional: `pro-${(i % 5) + 1}`,
    startTime: start,
    endTime: start + 30,
  };
});

export async function getSlotsCount() {
  return SLOTS.length;
}

export function encodeCursor(slot: Slot) {
  return Buffer.from(`${slot.startTime}:${slot.id}`).toString("base64");
}

export function decodeCursor(cursor: string) {
  try {
    const s = Buffer.from(cursor, "base64").toString();
    const [start, id] = s.split(":");
    return { startTime: Number(start), id: Number(id) };
  } catch {
    return null;
  }
}

export async function getSlotsAfter(opts: { cursor: { startTime: number; id: number } | null; limit: number; sort: "asc" | "desc" }) {
  const { cursor, limit, sort } = opts;
  const cloned = SLOTS.slice();
  cloned.sort((a, b) => (sort === "asc" ? a.startTime - b.startTime || a.id - b.id : b.startTime - a.startTime || b.id - a.id));

  if (!cursor) {
    return cloned.slice(0, limit);
  }

  const idx = cloned.findIndex((s) => {
    if (sort === "asc") {
      return s.startTime > cursor.startTime || (s.startTime === cursor.startTime && s.id > cursor.id);
    }

    return s.startTime < cursor.startTime || (s.startTime === cursor.startTime && s.id < cursor.id);
  });

  if (idx === -1) return [];

  return cloned.slice(idx, idx + limit);
}
