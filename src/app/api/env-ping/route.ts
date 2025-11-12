export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const hasUrl  = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasSrv  = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasApi  = !!process.env.SPORTSDATAIO_API_KEY;

  return new Response(
    JSON.stringify({
      runtime: "nodejs",
      NEXT_PUBLIC_SUPABASE_URL: hasUrl,
      SUPABASE_SERVICE_ROLE_KEY: hasSrv,
      SPORTSDATAIO_API_KEY: hasApi,
    }),
    { headers: { "content-type": "application/json" } }
  );
}
