import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ENV_PATH = resolve(process.cwd(), ".env");

export function setEnvValue(key: string, value: string): void {
  const line = `${key}=${value}`;
  let content = "";

  try {
    content = readFileSync(ENV_PATH, "utf8");
  } catch {
    writeFileSync(ENV_PATH, `${line}\n`, "utf8");
    return;
  }

  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(content)) {
    content = content.replace(pattern, line);
  } else {
    content = content.endsWith("\n") ? `${content}${line}\n` : `${content}\n${line}\n`;
  }

  writeFileSync(ENV_PATH, content, "utf8");
}
