import { defineEventHandler, readBody, type H3Event } from "h3";
import { createScoltaApi } from "../handlers.js";
import { resolveConfig, respond } from "./util.js";

/** server/api/scolta/v1/expand-query.post.ts -> /api/scolta/v1/expand-query */
export default defineEventHandler(async (event: H3Event) => {
  const body = await readBody<{ query?: string }>(event).catch(() => ({}));
  const result = await createScoltaApi(resolveConfig()).expandQuery(body);
  return respond(event, result);
});
