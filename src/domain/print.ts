export function printableHtml(title: string, text: string) {
  const escape = (s: string) =>
    s.replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
    );
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><style>@page{margin:18mm}body{font-family:Arial,sans-serif;color:#292823;line-height:1.6}h1{font-size:24px;color:#b5321d}pre{font-family:inherit;white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px}footer{margin-top:24px;font-size:11px;color:#777}</style></head><body><h1>${escape(title)}</h1><pre>${escape(text)}</pre><footer>Sofra · Yazgan · Paylaşım anındaki kopyadır.</footer></body></html>`;
}
