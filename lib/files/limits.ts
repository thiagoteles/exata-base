import { env } from "@/lib/env";
import { limitsFrom } from "./service";

/** The limits for this deployment, read from UPLOAD_MAX_MB and UPLOAD_TYPES. */
export const uploadLimits = () => limitsFrom(env.UPLOAD_MAX_MB, env.UPLOAD_TYPES);
