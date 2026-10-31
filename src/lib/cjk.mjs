const HAN = '\\u3040-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff';
const LATIN = 'A-Za-z0-9\\u00c0-\\u024f';

const HAN_LATIN = new RegExp(`([${HAN}])([${LATIN}])`, 'g');
const LATIN_HAN = new RegExp(`([${LATIN}])([${HAN}])`, 'g');
const IS_HAN = new RegExp(`[${HAN}]`);
const IS_LATIN = new RegExp(`[${LATIN}]`);

/** 中西文之间插入空格（构建时处理）。 */
export function pangu(text) {
  if (!text) return text;
  return String(text).replace(HAN_LATIN, '$1 $2').replace(LATIN_HAN, '$1 $2');
}

export function needsGap(prevChar, nextChar) {
  if (!prevChar || !nextChar) return false;
  return (IS_HAN.test(prevChar) && IS_LATIN.test(nextChar)) || (IS_LATIN.test(prevChar) && IS_HAN.test(nextChar));
}
