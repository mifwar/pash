import { homedir } from "os"
import { join } from "path"

/**
 * Resolve the password store root.
 *
 * Honors $PASSWORD_STORE_DIR (the standard `pass` env var) before
 * falling back to the conventional ~/.password-store location.
 */
export function resolveStoreRoot(): string {
  return process.env.PASSWORD_STORE_DIR ?? join(homedir(), ".password-store")
}
