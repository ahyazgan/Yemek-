import * as Print from 'expo-print';
import { printableHtml } from '../domain/print';
export async function printText(title: string, text: string) {
  await Print.printAsync({ html: printableHtml(title, text) });
}
