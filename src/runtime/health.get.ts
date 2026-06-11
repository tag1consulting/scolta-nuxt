import { defineEventHandler, type H3Event } from "h3";
import { useScoltaApi } from "./util.js";

/** server/api/scolta/v1/health.get.ts -> /api/scolta/v1/health */
export default defineEventHandler(async (_event: H3Event) => {
  return useScoltaApi().health();
});
