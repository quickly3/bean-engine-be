import * as fs from 'fs';
import * as path from 'path';
import * as Papa from 'papaparse';

export function readFilesInDirectory(directory) {
  const files = [];
  fs.readdirSync(directory).forEach((file) => {
    const filePath = path.join(directory, file);
    const stat = fs.lstatSync(filePath);
    if (stat.isDirectory()) {
      readFilesInDirectory(filePath);
    } else {
      files.push(filePath);
    }
  });
  return files;
}

export function saveJsonFile(filename, jsonData) {
  const jsonString = JSON.stringify(jsonData, null, 2);

  fs.writeFile(filename, jsonString, 'utf8', (err) => {
    if (err) {
      console.error('Error writing JSON file:', err);
    } else {
      // console.log('JSON file saved successfully.');
    }
  });
}

export async function saveJsonFileToCsv(filepath, jsonData) {
  const fileStr = Papa.unparse(jsonData);
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  await fs.writeFileSync(filepath, fileStr, 'utf8');
}

export async function readCsv(filepath) {
  const input_file = fs.readFileSync(filepath, 'utf8');
  // 最后一行为空时，Papa.parse会多解析出一行空数据，需要过滤掉
  const data = Papa.parse(input_file, { header: true }).data;
  return data.filter((row) => Object.values(row).some((value) => value !== ''));
}

export function jsonToCsvString(jsonData) {
  return Papa.unparse(jsonData);
}

export async function saveMd(filepath, content) {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  await fs.writeFileSync(filepath, content, 'utf8');
}
