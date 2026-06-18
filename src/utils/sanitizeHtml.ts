import DOMPurify from 'dompurify';

const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'a'];
const ALLOWED_ATTR = ['href', 'target', 'rel'];

export const sanitizeHtml = (html: string): string =>
  DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
