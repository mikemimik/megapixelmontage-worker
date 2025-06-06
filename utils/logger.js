import pino from "pino";

let logger = null;

export function getLogger(functionName) {
  if (logger) {
    return logger.child({ function: functionName });
  }

  logger = createLogger();

  return logger.child({ function: functionName });
}

export function createLogger({ level = process.env.LOG_LEVEL || "info" }) {
  if (logger) {
    return logger;
  }

  logger = pino({
    name: "worker",
    level,
  });

  return logger;
}
