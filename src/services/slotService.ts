import { getSlotsCount, getSlotsSlice } from "../repositories/slotRepository";

export const MAX_LIMIT = 100;

export async function listSlots(opts: { page: number; limit: number; sort: "asc" | "desc" }) {
  const { page, limit, sort } = opts;
  const total = await getSlotsCount();

  const offset = (page - 1) * limit;
  const data = await getSlotsSlice({ offset, limit, sort });

  return { data, total };
}
