import { writeFileSync, readFileSync } from "fs";
import { LogEntry,LogEntryWithoutContext } from "../types/loggerTypes";
import path from "path";


const logFilePath = path.join(__dirname,"../model/activity.log");

export const ReadLog = (filepath = logFilePath) => {
    try {
        const log = readFileSync(logFilePath, { encoding: "utf8" });
        const lines = log.split("\n").filter(line => line.trim() !== "");
        const logEntries: LogEntryWithoutContext[] = lines.map(line => {
            const [level, timestamp, ...messageParts] = line.split(" - ");
            return {
                level: level.trim() as LogEntryWithoutContext['level'],
                timestamp: timestamp,
                message: messageParts.join(" - ").trim()
            };
        });
    } catch (error: any) {
        console.error(`Error reading log file: ${error.message}`);
        throw error;
    }
}

export const WriteToLog = (content: LogEntry) => {
    try {
        const existentItems = readFileSync(logFilePath, { encoding: "utf8" });
        const newContent = `${existentItems} ${content.level} - ${new Date().toISOString()} - ${content.message}\n`;
        writeFileSync(logFilePath, newContent, { encoding: "utf8" });
        return `Log written to ${logFilePath}`;
    } catch (error:any) {
        console.error(`Error writing to log file: ${error.message}`);
        throw error;
    }
}