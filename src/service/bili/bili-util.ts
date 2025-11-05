/**
 * 遍历 JSON 数组，将所有 BigInt 类型字段转换为 number 类型
 * @param arr 输入的 JSON 数组
 * @returns 转换后的数组
 */
export function convertBigIntToNumberInArray(arr: any[]): any[] {
  return arr.map((item) => convertBigIntToNumber(item));
}

/**
 * 递归遍历对象，将 BigInt 类型字段转换为 number 类型
 * @param obj 输入对象
 * @returns 转换后的对象
 */
function convertBigIntToNumber(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToNumber);
  } else if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      if (typeof obj[key] === 'bigint') {
        result[key] = Number(obj[key]);
      } else if (typeof obj[key] === 'object') {
        result[key] = convertBigIntToNumber(obj[key]);
      } else {
        result[key] = obj[key];
      }
    }
    return result;
  }
  return obj;
}
