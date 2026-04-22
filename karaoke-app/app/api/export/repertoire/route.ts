import { NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";

/** CSV export of the caller's repertoire (song-level metadata + confidence). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("repertoire")
    .select(
      `
      id, confidence, is_favorite, preferred_key, memo, added_at,
      song:songs(title, artist, vocal_range_lowest, vocal_range_highest, genre)
    `,
    )
    .order("added_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = {
    id: string;
    confidence: string | null;
    is_favorite: boolean | null;
    preferred_key: number | null;
    memo: string | null;
    added_at: string;
    song: {
      title: string;
      artist: string;
      vocal_range_lowest: number | null;
      vocal_range_highest: number | null;
      genre: string | null;
    } | null;
  };
  const rows = (data ?? []) as unknown as Row[];

  const flat = rows.map((r) => ({
    title: r.song?.title ?? "",
    artist: r.song?.artist ?? "",
    confidence: r.confidence ?? "",
    is_favorite: r.is_favorite ? "1" : "0",
    preferred_key: r.preferred_key ?? "",
    range_low: r.song?.vocal_range_lowest ?? "",
    range_high: r.song?.vocal_range_highest ?? "",
    genre: r.song?.genre ?? "",
    memo: r.memo ?? "",
    added_at: r.added_at,
    id: r.id,
  }));

  const csv = toCsv(flat, [
    { key: "title", header: "title" },
    { key: "artist", header: "artist" },
    { key: "confidence", header: "confidence" },
    { key: "is_favorite", header: "is_favorite" },
    { key: "preferred_key", header: "preferred_key" },
    { key: "range_low", header: "vocal_range_lowest" },
    { key: "range_high", header: "vocal_range_highest" },
    { key: "genre", header: "genre" },
    { key: "memo", header: "memo" },
    { key: "added_at", header: "added_at" },
    { key: "id", header: "repertoire_id" },
  ]);

  const filename = `karaoke_repertoire_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
