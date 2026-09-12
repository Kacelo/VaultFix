import { notFound } from "next/navigation";
import { getElectricianById } from "@/lib/supabase/actions";

/**
 * Existence check lives in the layout, not the page, so that a bad id gets a
 * real HTTP 404.
 *
 * `loading.tsx` wraps the page in a Suspense boundary, which means the response
 * starts streaming — and the 200 status is committed — before the page body
 * runs. A `notFound()` down there still renders the 404 UI but can no longer
 * change the status code, leaving a soft 404 that search engines happily index.
 * The layout renders outside that boundary, so it is the last place able to
 * set the status.
 *
 * The read is free: `getElectricianById` is memoised per request, so the page
 * below reuses this exact result rather than querying again.
 */
export default async function TechnicianProfileLayout(
  props: LayoutProps<"/technicians/[id]">
) {
  const { id } = await props.params;
  const electrician = await getElectricianById(decodeURIComponent(id));

  if (!electrician) {
    notFound();
  }

  return props.children;
}
