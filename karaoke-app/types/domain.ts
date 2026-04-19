import type { Database } from "./database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Song = Database["public"]["Tables"]["songs"]["Row"];
export type Score = Database["public"]["Tables"]["scores"]["Row"];
export type Session = Database["public"]["Tables"]["sessions"]["Row"];
export type ScorePitchInterval =
  Database["public"]["Tables"]["score_pitch_intervals"]["Row"];
export type Repertoire = Database["public"]["Tables"]["repertoire"]["Row"];
export type Setlist = Database["public"]["Tables"]["setlists"]["Row"];
export type SetlistItem = Database["public"]["Tables"]["setlist_items"]["Row"];
export type SyncLog = Database["public"]["Tables"]["sync_logs"]["Row"];

export type ConfidenceLevel = Database["public"]["Enums"]["confidence_level"];
export type RangeSource = Database["public"]["Enums"]["range_source"];
export type ScoringType = Database["public"]["Enums"]["scoring_type"];

export type TableName = keyof Database["public"]["Tables"];
export type EnumName = keyof Database["public"]["Enums"];
