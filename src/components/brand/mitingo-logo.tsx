export function MitingoLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#67e8f9,#34d399)] text-base font-black text-slate-950 shadow-[0_14px_28px_rgba(34,211,238,0.30)]">
        M
      </div>
      <div>
        <p className="text-lg font-semibold tracking-[0.16em] text-slate-950 uppercase">Mitingo</p>
        <p className="text-xs text-slate-500">Video calls for fast-moving teams</p>
      </div>
    </div>
  );
}
