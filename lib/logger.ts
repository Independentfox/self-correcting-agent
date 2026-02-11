type LogLevel = "info" | "warn" | "error" | "debug";

const COLORS: Record<LogLevel, string> = {
  info: "\x1b[36m",   // cyan
  warn: "\x1b[33m",   // yellow
  error: "\x1b[31m",  // red
  debug: "\x1b[90m",  // gray
};
const RESET = "\x1b[0m";

function formatTimestamp(): string {
  return new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
}

function log(level: LogLevel, tag: string, message: string, data?: unknown) {
  const color = COLORS[level];
  const prefix = `${color}[${formatTimestamp()}] [${level.toUpperCase()}] [${tag}]${RESET}`;
  if (data !== undefined) {
    console.log(prefix, message, typeof data === "string" ? data : JSON.stringify(data, null, 2));
  } else {
    console.log(prefix, message);
  }
}

export const logger = {
  info: (tag: string, message: string, data?: unknown) => log("info", tag, message, data),
  warn: (tag: string, message: string, data?: unknown) => log("warn", tag, message, data),
  error: (tag: string, message: string, data?: unknown) => log("error", tag, message, data),
  debug: (tag: string, message: string, data?: unknown) => log("debug", tag, message, data),
};
