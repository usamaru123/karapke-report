import { NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";

/**
 * CSV export of the caller's score history. RLS on `scores` ensures we only
 * leak the caller's own rows even if the route is linked from elsewhere.
 *
 * Columns are a curated subset — full `raw_xml` is kept out intentionally
 * (large, noisy, not useful in a spreadsheet). Users who want the raw data
 * should use Supabase directly.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("scores")
    .select(
      `
      id, sung_at, total_score, scoring_type, key_control,
      pitch_score, stability_score, expression_score,
      vibrato_longtone_score, rhythm_score,
      intonation_percent,
      song:songs(title, artist)
    `,
    )
    .order("sung_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = {
    id: string;
    sung_at: string;
    total_score: number | string | null;
    scoring_type: string | null;
    key_control: number | null;
    pitch_score: number | string | null;
    stability_score: number | string | null;
    expression_score: number | string | null;
    vibrato_longtone_score: number | string | null;
    rhythm_score: number | string | null;
    intonation_percent: number | string | null;
    song: { title: string; artist: string } | null;
  };
  const rows = (data ?? []) as unknown as Row[];

  const flat = rows.map((r) => ({
    sung_at: r.sung_at,
    title: r.song?.title ?? "",
    artist: r.song?.artist ?? "",
    total: r.total_score ?? "",
    pitch: r.pitch_score ?? "",
    stability: r.stability_score ?? "",
    expression: r.expression_score ?? "",
    vibrato_longtone: r.vibrato_longtone_score ?? "",
    rhythm: r.rhythm_score ?? "",
    intonation_percent: r.intonation_percent ?? "",
    key_control: r.key_control ?? "",
    scoring_type: r.scoring_type ?? "",
    id: r.id,
  }));

  const csv = toCsv(flat, [
    { key: "sung_at", header: "sung_at" },
    { key: "title", header: "title" },
    { key: "artist", header: "artist" },
    { key: "total", header: "total_score" },
    { key: "pitch", header: "pitch_score" },
    { key: "stability", header: "stability_score" },
    { key: "expression", header: "expression_score" },
    { key: "vibrato_longtone", header: "vibrato_longtone_score" },
    { key: "rhythm", header: "rhythm_score" },
    { key: "intonation_percent", header: "intonation_percent" },
    { key: "key_control", header: "key_control" },
    { key: "scoring_type", header: "scoring_type" },
    { key: "id", header: "score_id" },
  ]);

  const filename = `karaoke_scores_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
