import sanitizeHtml from 'sanitize-html';

export function cleanText(value = '') {
  return sanitizeHtml(String(value), { allowedTags: [], allowedAttributes: {} }).trim();
}

export function cleanNullableText(value = '') {
  const cleaned = cleanText(value);
  return cleaned || '';
}
