import { CandidateList } from "./CandidateList";
import { Expired } from "./Expired";
import { Gate } from "./Gate";

// /s/{token}: the client viewer entry. No tenant session; the share link token + a viewer cookie decide what to show.
// TODO(share-viewer): load the link by token (status, expiresAt, maxViews) → <Expired/>; no valid rv_{token} cookie → <Gate/>;
// otherwise <CandidateList/> (a single-candidate link redirects to its detail). Pin the UI language with
// setRequestLocale(link.viewerLang) (see i18n/request.ts). Until then ?preview=list|expired shows the other static states.
export default async function ViewerPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ preview?: string }> }) {
  const { token } = await params;
  const { preview } = await searchParams;
  if (preview === "expired") return <Expired />;
  if (preview === "list") return <CandidateList token={token} />;
  return <Gate />;
}
