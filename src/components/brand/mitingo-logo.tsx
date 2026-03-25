export function MitingoLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-300 text-base font-black text-slate-950 shadow-[0_12px_24px_rgba(103,232,249,0.35)]">
        M
      </div>
      <div>
        <p className="text-lg font-semibold tracking-[0.16em] text-white uppercase">Mitingo</p>
        <p className="text-xs text-slate-400">Video calls for fast-moving teams</p>
      </div>
    </div>
  );
}
