import fs from "node:fs";
import path from "node:path";
import db from "./db.js";

const backupDir = path.resolve(process.env.BACKUP_DIR || "server/backups");
fs.mkdirSync(backupDir, { recursive: true });

export function createBackup() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = path.join(backupDir, `dairy-${stamp}.db`);
  db.backup(target);
  return target;
}

export function startBackupScheduler() {
  try { createBackup(); } catch (e) { console.error("Initial backup failed:", e.message); }
  setInterval(() => {
    try { createBackup(); } catch (e) { console.error("Scheduled backup failed:", e.message); }
  }, 24 * 60 * 60 * 1000);
}
