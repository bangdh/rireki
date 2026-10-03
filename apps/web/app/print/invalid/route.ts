/** Target of the print page's redirect when the candidate's CV fails CvSchema: the worker reads the 409 and skips the render. */
export function GET() {
  return new Response("cv invalid", { status: 409, headers: { "Cache-Control": "no-store" } });
}
