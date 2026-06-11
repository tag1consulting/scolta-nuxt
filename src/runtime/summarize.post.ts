import { defineEventHandler, readBody, type H3Event } from "h3";
import { respond, useScoltaApi } from "./util.js";

/** server/api/scolta/v1/summarize.post.ts -> /api/scolta/v1/summarize */
export default defineEventHandler(async (event: H3Event) => {
  const body = await readBody<{ query?: string; context?: string }>(event).catch(() => ({}));
  const result = await useScoltaApi().summarize(body);
  return respond(event, result);
});
