import { writeFileSync, readFileSync } from "fs";

const filepath = "../restocking.csvs";

const createFile = (content: string | NodeJS.ArrayBufferView) => {
    writeFileSync(filepath, content, { encoding: "utf8" });
    return `File created at ${filepath}`;
}

module.exports = {
    createFile
}