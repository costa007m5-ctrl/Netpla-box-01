type LogArg = Record<string, unknown> | string | Error;

function fmt(obj: LogArg, msg?: string): string {
  if (typeof obj === "string") return obj;
  const m = msg ? `${msg} ` : "";
  try {
    return m + JSON.stringify(obj, Object.getOwnPropertyNames(obj));
  } catch {
    return m + String(obj);
  }
}

export const logger = {
  info:  (obj: LogArg, msg?: string) => console.log("[INFO]",  fmt(obj, msg)),
  error: (obj: LogArg, msg?: string) => console.error("[ERROR]", fmt(obj, msg)),
  warn:  (obj: LogArg, msg?: string) => console.warn("[WARN]",  fmt(obj, msg)),
  debug: (obj: LogArg, msg?: string) => console.debug("[DEBUG]", fmt(obj, msg)),
};
