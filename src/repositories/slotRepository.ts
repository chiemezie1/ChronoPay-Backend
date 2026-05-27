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

export async function getSlotsSlice(opts: { offset: number; limit: number; sort: "asc" | "desc" }) {
  const { offset, limit, sort } = opts;
  const cloned = SLOTS.slice();
  cloned.sort((a, b) => (sort === "asc" ? a.startTime - b.startTime : b.startTime - a.startTime));
  return cloned.slice(offset, offset + limit);
}
