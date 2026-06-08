import { defineEventHandler, type H3Event } from "h3";
import { createScoltaApi } from "../handlers.js";
import { resolveConfig } from "./util.js";

/** server/api/scolta/v1/health.get.ts -> /api/scolta/v1/health */
export default defineEventHandler(async (_event: H3Event) => {
  return createScoltaApi(resolveConfig()).health();
});
