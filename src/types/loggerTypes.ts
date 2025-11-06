export type LogEntry = {
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    context?: string;
};

export type LogEntryWithoutContext = Omit<LogEntry,'context'>;