import { CvFile } from "@/lib/extraction/form";
import { createImportJob } from "@/lib/extraction/jobs";
import { requireImportSession } from "@/lib/extraction/session";

/** 303 See Other: the browser GETs the next page after this POST (redirect() in a Route Handler would answer 307 and re-POST). */
const seeOther = (location: string) => new Response(null, { status: 303, headers: { Location: location } });

/**
 * POST multipart { file } from /candidates/import → the file in rireki-originals + ImportJob + extract.cv job → the review page.
 * A Route Handler rather than a Server Action because Server Actions cap request bodies at 1 MB (next.config.ts is shared).
 * A wrong type or size sends the form back with ?error=file.
 */
export async function POST(req: Request) {
  const { tenantId, userId } = await requireImportSession();
  const form = await req.formData().catch(() => null);
  const file = CvFile.safeParse(form?.get("file"));
  if (!file.success) return seeOther("/candidates/import?error=file");
  const jobId = await createImportJob({ tenantId, userId, file: file.data });
  return seeOther(`/candidates/import/${jobId}`);
}
