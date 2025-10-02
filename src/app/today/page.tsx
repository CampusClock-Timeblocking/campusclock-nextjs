// FILE: src/app/today/page.tsx
// Dummy-Zielseite nach dem Wizard + Guided-Tour Hook
"use client";
import { useEffect, useState } from "react";

export default function TodayPage() {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const flag = localStorage.getItem("showGuidedTour");
    if (flag === "1") {
      setShowTour(true);
      localStorage.removeItem("showGuidedTour");
    }
  }, []);

  return (
    <main className="min-h-screen bg-neutral-50 p-6">
      <h1 className="mb-4 text-xl font-semibold">Heute</h1>

      {/* Platzhalter für deine echte Today-Ansicht */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <p className="text-neutral-600">
          Hier erscheint dein Plan (Tasks, Slots, Habits).
        </p>
      </div>

      {/* Level-2 Guided Tour (leichtgewichtig) */}
      {showTour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-medium">Kurze Tour</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-neutral-700">
              <li><b>Heute-Ansicht:</b> Zeigt deinen aktuellen Plan.</li>
              <li><b>Snooze/Skip:</b> Aufgabe verschieben oder überspringen.</li>
              <li><b>Neu planen:</b> Nutze Re-Planen, wenn sich dein Tag ändert.</li>
            </ol>
            <div className="mt-5 flex justify-end gap-3">
              <a
                href="/settings/scheduling"
                className="rounded-xl border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
              >
                Feinjustieren
              </a>
              <button
                className="rounded-xl bg-black px-4 py-2 text-sm text-white"
                onClick={() => setShowTour(false)}
              >
                Los geht’s
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
