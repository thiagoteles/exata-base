/** The shape every log destination implements. */
export type LogFields = Readonly<Record<string, unknown>>;

export type Logger = {
  debug: (message: string, fields?: LogFields) => void;
  info: (message: string, fields?: LogFields) => void;
  warn: (message: string, fields?: LogFields) => void;
  error: (message: string, fields?: LogFields) => void;
  child: (bindings: LogFields) => Logger;
};
