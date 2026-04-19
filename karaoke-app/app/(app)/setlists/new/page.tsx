import { NewSetlistForm } from "@/components/features/setlist/NewSetlistForm";

export default function NewSetlistPage() {
  return (
    <div className="mx-auto max-w-md px-4 pt-8 pb-24 md:pb-8">
      <h1 className="text-xl font-semibold text-white">
        新しいセットリストを作る
      </h1>
      <p className="mt-1 text-sm text-white/60">
        名前を付けるだけで作成できます。曲の追加は次の画面で。
      </p>
      <div className="mt-6">
        <NewSetlistForm />
      </div>
    </div>
  );
}
