import { STORAGE_KEYS, readString, writeString } from './storage';

/**
 * A random id for this install, made on first use.
 *
 * Sent with AI requests so the proxy can rate-limit signed-out phones one by
 * one instead of lumping everyone behind the same carrier address together.
 * It is not tied to the person, the device hardware or the account, and it is
 * not a secret: "Erase everything on this phone" clears it and the next
 * request makes a new one.
 */
function randomId() {
  let id = '';
  for (let i = 0; i < 32; i++) id += Math.floor(Math.random() * 16).toString(16);
  return id;
}

export async function getInstallId() {
  let id = await readString(STORAGE_KEYS.INSTALL_ID).catch(() => null);
  if (!id) {
    id = randomId();
    await writeString(STORAGE_KEYS.INSTALL_ID, id).catch(() => {});
  }
  return id;
}
