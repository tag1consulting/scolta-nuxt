import { defineEventHandler, readBody, type H3Event } from "h3";
import type { ai } from "scolta";
import { createScoltaApi } from "../handlers.js";
import { resolveConfig, respond } from "./util.js";

/** server/api/scolta/v1/followup.post.ts -> /api/scolta/v1/followup */
export default defineEventHandler(async (event: H3Event) => {
  const body = await readBody<{ messages?: ai.ChatMessage[] }>(event).catch(() => ({}));
  const result = await createScoltaApi(resolveConfig()).followUp(body);
  return respond(event, result);
});
