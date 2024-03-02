import * as fse from 'fs-extra';
import * as fs from 'fs';
import * as path from 'path';

export function saveJsonToFile(jsonData, filePath) {
  const dirPath = path.dirname(filePath);
  fse.ensureDirSync(dirPath);

  const jsonString = JSON.stringify(jsonData, null, 2);

  fs.writeFileSync(filePath, jsonString);
}

export function readJsonToFile(filePath) {
  const fileString = fs.readFileSync(filePath, 'utf8');
  const jsonData = JSON.parse(fileString);
  return jsonData;
}

export function fileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
}
