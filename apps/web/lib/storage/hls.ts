/**
 * Rewrites an HLS playlist for a viewer: every segment line (non-empty, not a #tag) becomes `sign(file)`, i.e. a presigned
 * URL on the public S3 endpoint; tags and blank lines are kept. Pure apart from the caller's signer (see hls.test.ts).
 */
export async function rewriteManifest(m3u8: string, sign: (file: string) => string | Promise<string>): Promise<string> {
  const lines = await Promise.all(
    m3u8.split(/\r?\n/).map((line) => {
      const file = line.trim();
      return file && !file.startsWith("#") ? sign(file) : line;
    }),
  );
  return lines.join("\n");
}
