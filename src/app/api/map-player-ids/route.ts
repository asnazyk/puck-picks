// Minimal smoke test for /api/map-player-ids
export async function GET() {
  return new Response(JSON.stringify({ ok: true, ping: "map-player-ids alive" }), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}
