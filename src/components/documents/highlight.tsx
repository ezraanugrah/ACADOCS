const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Tandai kata yang dicari di dalam teks (tidak peka huruf besar/kecil). */
export function Highlight({ text, terms }: { text: string; terms?: string[] }) {
  const words = (terms ?? []).filter(Boolean);
  if (words.length === 0) return <>{text}</>;

  const parts = text.split(new RegExp(`(${words.map(escapeRegExp).join("|")})`, "gi"));
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <mark key={index} className="rounded-sm bg-soft-strong px-0.5 text-ink">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}
