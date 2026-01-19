export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return Response.json({ ok: false, error: "lat/lon required" }, { status: 400 });
  }

  // Open-Meteo: free, no API key required
  const q = new URL("https://api.open-meteo.com/v1/forecast");
  q.searchParams.set("latitude", String(lat));
  q.searchParams.set("longitude", String(lon));
  q.searchParams.set("current", "temperature_2m,wind_speed_10m,weather_code");
  q.searchParams.set("hourly", "temperature_2m,precipitation_probability");
  q.searchParams.set("forecast_days", "1");
  q.searchParams.set("timezone", "auto");

  try {
    const r = await fetch(q.toString(), { cache: "no-store" });
    if (!r.ok) {
      return Response.json({ ok: false, error: `Upstream ${r.status}` }, { status: 502 });
    }
    const data = await r.json();

    const current = data?.current ?? null;
    const hourly = data?.hourly ?? null;

    return Response.json({
      ok: true,
      current: current
        ? {
            time: current.time,
            temperature_2m: current.temperature_2m,
            wind_speed_10m: current.wind_speed_10m,
            weather_code: current.weather_code,
          }
        : null,
      hourly: hourly
        ? {
            time: hourly.time,
            temperature_2m: hourly.temperature_2m,
            precipitation_probability: hourly.precipitation_probability,
          }
        : null,
    });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message ?? "Weather fetch failed" }, { status: 500 });
  }
}
