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
