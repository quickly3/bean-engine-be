import * as fse from 'fs-extra';
import * as fs from 'fs';
import * as path from 'path';
import * as marked from 'marked';
import * as JSON5 from 'json5';

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

export function extractJsonFromMarkdown(md) {
  const tokens = marked.lexer(md);
  const code = tokens.find((t) => t.type === 'code' && t.lang === 'json');
  console.log(code);
  return code ? code : md;
}

export function convertMarkdownJson(md) {
  try {
    const jsonStr = extractJsonFromMarkdown(md);
    const obj = JSON5.parse(jsonStr);
    return JSON5.stringify(obj, { space: 2, quote: '' });
  } catch (e) {
    console.error('Conversion failed:', e);
    return md;
  }
}
