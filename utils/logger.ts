const IS_DEV = __DEV__;

type LogLevel = "info" | "warn" | "error" | "debug";

function log(level: LogLevel, tag: string, message: string, data?: unknown) {
  if (!IS_DEV) return;
  const prefix = `[Pixent:${tag}]`;
  if (level === "error") {
    console.error(prefix, message, data ?? "");
  } else if (level === "warn") {
    console.warn(prefix, message, data ?? "");
  } else {
    console.log(prefix, message, data ?? "");
  }
}

export const logger = {
  info: (tag: string, msg: string, data?: unknown) => log("info", tag, msg, data),
  warn: (tag: string, msg: string, data?: unknown) => log("warn", tag, msg, data),
  error: (tag: string, msg: string, data?: unknown) => log("error", tag, msg, data),
  debug: (tag: string, msg: string, data?: unknown) => log("debug", tag, msg, data),
};
