import { appCommand } from "./app";

/**
 * Compatibility alias for legacy 'mint web' -> routes directly to the new Mint Desktop App
 */
export async function webCommand(options: { open?: boolean } = { open: true }) {
  return appCommand(options);
}
