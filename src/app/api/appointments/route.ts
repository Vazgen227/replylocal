import { z } from "zod";
import { createAppointmentSchema } from "@/lib/booking";
import { endpoint, identity, jsonBody, store } from "@/server/http";
import { bookings } from "@/server/booking-http";
import { wakeWorker } from "@/server/omni-http";
import { AppError } from "@/server/errors";
export const runtime = "nodejs";
export const GET = endpoint(async (request) => {
  const actor = await identity();
  const url = new URL(request.url);
  const from = z.iso.datetime({ offset: true }).parse(url.searchParams.get("from"));
  const to = z.iso.datetime({ offset: true }).parse(url.searchParams.get("to"));
  const span = new Date(to).getTime() - new Date(from).getTime();
  if (span <= 0 || span > 62 * 86400000) throw new AppError(400, "INVALID_INPUT");
  return { appointments: await bookings.list(actor, new Date(from), new Date(to)) };
});
export const POST = endpoint(async (request) => {
  const actor = await identity();
  const input = await jsonBody(request, createAppointmentSchema);
  await store.rateLimit(`operator:${actor.organizationId}`, 300, 900);
  const result = await bookings.create(actor, input);
  wakeWorker();
  return result;
}, 201);
