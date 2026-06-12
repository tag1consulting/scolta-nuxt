import { defineEventHandler, readBody, type H3Event } from "h3";
import { respond, useScoltaApi } from "./util.js";

/** server/api/scolta/v1/expand-query.post.ts -> /api/scolta/v1/expand-query */
export default defineEventHandler(async (event: H3Event) => {
  const body = await readBody<{ query?: string }>(event).catch(() => ({}));
  const result = await useScoltaApi().expandQuery(body);
  return respond(event, result);
});
