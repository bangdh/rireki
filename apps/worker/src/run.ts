import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Runs ffmpeg / ffprobe / pdftoppm without a shell; rejects with the tail of stderr so job failures say why. */
export async function run(cmd: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync(cmd, args, { maxBuffer: 16 * 1024 * 1024 });
    return stdout;
  } catch (e) {
    const err = e as { stderr?: string; message: string };
    throw new Error(`${cmd} failed: ${(err.stderr || err.message).trim().slice(-2000)}`);
  }
}
