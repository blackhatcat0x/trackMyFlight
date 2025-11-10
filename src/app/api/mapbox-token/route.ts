// app/api/mapbox-token/route.ts
export async function GET() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
  
  if (!token) {
    return Response.json(
      { error: 'Mapbox token not configured' },
      { status: 500 }
    );
  }

  return Response.json({ token });
}
