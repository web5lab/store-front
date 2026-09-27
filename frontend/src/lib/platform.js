import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/** True inside the Android app, false in a browser. */
export const isNative = Capacitor.isNativePlatform();

/* The server stores uploads as "/uploads/…". In the browser that path is
   same-origin; in the app (or with a separately hosted API) it has to point at
   the API's host instead. */
const apiOrigin = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');

export const fileUrl = (path) => (path && path.startsWith('/') ? `${apiOrigin}${path}` : path);

const toBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/**
 * Hand a downloaded file to the person. A WebView ignores <a download>, so in
 * the app the file is written to the cache and offered through the share
 * sheet (save to Files/Drive, send on WhatsApp, open in a PDF viewer…).
 */
export async function saveFile(blob, name) {
  if (isNative) {
    const { uri } = await Filesystem.writeFile({ path: name, data: await toBase64(blob), directory: Directory.Cache });
    await Share.share({ title: name, files: [uri] });
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
