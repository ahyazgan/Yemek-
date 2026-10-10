import { printableHtml } from '../domain/print';
export async function printText(title: string, text: string) {
  const frame = document.createElement('iframe');
  frame.title = 'Yazdırma önizlemesi';
  frame.style.position = 'fixed';
  frame.style.width = '1px';
  frame.style.height = '1px';
  frame.style.border = '0';
  frame.setAttribute('sandbox', 'allow-same-origin allow-modals');
  const cleanup = () => {
    frame.remove();
  };
  const timeout = setTimeout(cleanup, 60000);
  frame.onload = () => {
    const target = frame.contentWindow;
    if (!target) {
      clearTimeout(timeout);
      cleanup();
      return;
    }
    target.onafterprint = () => {
      clearTimeout(timeout);
      cleanup();
    };
    target.focus();
    target.print();
  };
  frame.srcdoc = printableHtml(title, text);
  document.body.appendChild(frame);
}
