// FILE: src/app/settings/scheduling/page.tsx
// Optional: Vollständige Settings-Seite (Level-3)
export default function SchedulingSettingsPage() {
  return (
    <main className="min-h-screen bg-neutral-50 p-6">
      <h1 className="mb-4 text-xl font-semibold">Planungs-Einstellungen</h1>
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 text-sm text-neutral-700">
        <p>
          Hier landen später alle Parameter (WorkingPreferences, SchedulingConfig,
          Energy fine-tuning, ExcludedPeriods…).
        </p>
      </div>
    </main>
  );
}
