import * as fs from 'fs';
import * as path from 'path';

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
