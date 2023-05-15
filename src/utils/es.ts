export const escapeElasticReservedChars = (keyword) => {
  return keyword.replace(/([\!\*\+\&\|\(\)\[\]\{\}\^\~\?\:\"])/g, '\\$1');
};
