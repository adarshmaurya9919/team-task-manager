import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../data');
const file = join(dataDir, 'db.json');

const defaultData = {
  users: [],
  projects: [],
  projectMembers: [],
  tasks: [],
  comments: []
};

function read() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  if (!existsSync(file)) {
    writeFileSync(file, JSON.stringify(defaultData, null, 2));
    return JSON.parse(JSON.stringify(defaultData));
  }
  try {
    const raw = readFileSync(file, 'utf-8');
    const parsed = JSON.parse(raw);
    return { ...defaultData, ...parsed };
  } catch {
    return JSON.parse(JSON.stringify(defaultData));
  }
}

function write(data) {
  writeFileSync(file, JSON.stringify(data, null, 2));
}

export async function getDb() {
  const data = read();
  return {
    data,
    write: () => write(data)
  };
}
