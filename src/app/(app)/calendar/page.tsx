"use client";

import { useState } from "react";
// Sie benötigen diese Typen-Definitionen (siehe Schritt 2)
import type { Project, Task, Habit } from "@/types/planning"; 
import { toast } from "sonner";

// ANNAHME: Sie haben diese UI-Komponenten (z.B. von shadcn/ui)
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// --- BEISPIELDATEN (Direkt in die Komponente eingefügt) ---
const beispielProjekte: Project[] = [
  {
    id: "proj_1",
    title: "Website Relaunch",
    description: "Komplette Neugestaltung der Marketing-Website.",
  },
  {
    id: "proj_2",
    title: "Q4 Marketingkampagne",
    description: "Planung und Durchführung der Weihnachtskampagne.",
  },
];
const beispielAufgaben: Task[] = [
  {
    id: "task_1",
    title: "Design-Mockups erstellen",
    projectId: "proj_1",
    priority: "high",
    estimatedDuration: 180,
    deadline: new Date("2025-11-09T23:59:00"), // 09/11/2025 aus Ihrem Bild
  },
  {
    id: "task_2",
    title: "Steuererklärung 2024 vorbereiten",
    priority: "medium",
    estimatedDuration: 240,
  },
  {
    id: "task_3",
    title: "Keyword-Recherche für Blog",
    projectId: "proj_2",
    priority: "low",
    estimatedDuration: 90,
  },
];
const beispielGewohnheiten: Habit[] = [
  {
    id: "hab_1",
    title: "Fitnessstudio",
    frequency: "weekly",
    timesPerWeek: 3,
    preferredTime: "evening",
    duration: 60,
  },
  {
    id: "hab_2",
    title: "Täglich Deutsch lernen",
    frequency: "daily",
    preferredTime: "morning",
    duration: 30,
  },
];
// --- Ende Beispieldaten ---

export default function ProjectsTasksHabitsPage() {
  const [projects, setProjects] = useState<Project[]>(beispielProjekte);
  const [tasks, setTasks] = useState<Task[]>(beispielAufgaben);
  const [habits, setHabits] = useState<Habit[]>(beispielGewohnheiten);

  // --- START: Demo-Simulation ---
  const [isLoading, setIsLoading] = useState(false);

  const handleOptimizeClick = () => {
    // 1. Ladezustand aktivieren
    setIsLoading(true);

    // 2. "Fake" Backend-Aufruf simulieren (z.B. 1.5 Sekunden)
    setTimeout(() => {
      // 3. Ladezustand deaktivieren
      setIsLoading(false);

      // 4. Erfolgsmeldung anzeigen
      toast.success("Kalender wurde optimiert!", {
        description: "5 Aufgaben und 2 Gewohnheiten wurden eingetragen.",
        position: "bottom-left",
      });

      // Optional: Geplante Aufgaben aus der Liste entfernen
      // setTasks([]); 
    }, 1500);
  };
  // --- ENDE: Demo-Simulation ---

  return (
    <div className="container mx-auto p-4 md:p-8">
      {/* --- HEADER --- */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Projekte, Aufgaben & Gewohnheiten
          </h1>
          <p className="text-muted-foreground">
            Definieren Sie hier Ihre Ziele. Der AI Optimizer plant sie
            intelligent ein.
          </p>
        </div>
        <Button
          size="lg"
          onClick={handleOptimizeClick}
          disabled={isLoading} // Gesteuert durch unseren 'useState'
        >
          {isLoading
            ? "Optimiere..." // Zeigt Lade-Text
            : "Meine Woche planen"}
        </Button>
      </div>

      {/* --- 2-SPALTEN-LAYOUT (wie in Ihrem Screenshot) --- */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-5">
        
        {/* === LINKE SEITENLEISTE (20% Breite) === */}
        <aside className="lg:col-span-1">
          <div className="sticky top-20 rounded-lg border bg-card p-3">
            <p className="text-center text-sm text-muted-foreground">
              [Platzhalter für Mini-Kalender]
            </p>
          </div>
        </aside>

        {/* === HAUPTINHALT (80% Breite) === */}
        <main className="lg:col-span-4">
          <div className="flex flex-col gap-10">
            
            {/* --- PROJEKTE --- */}
            <section id="projekte">
              <h2 className="mb-4 text-2xl font-semibold">Projekte</h2>
              <div className="flex flex-col gap-4">
                {projects.map((proj) => (
                  <Card key={proj.id} className="bg-card/50">
                    <CardHeader>
                      <CardTitle>{proj.title}</CardTitle>
                      <CardDescription>{proj.description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </section>

            {/* --- AUFGABEN --- */}
            <section id="aufgaben">
              <h2 className="mb-4 text-2xl font-semibold">Aufgaben</h2>
              <div className="flex flex-col gap-4">
                {tasks.map((task) => (
                  <Card key={task.id} className="bg-card/50">
                    <CardHeader>
                      <CardTitle>{task.title}</CardTitle>
                      <CardDescription>
                        {task.projectId
                          ? `Projekt: ${
                              projects.find((p) => p.id === task.projectId)?.title
                            }`
                          : "Einzelaufgabe"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      <p>Dauer: {task.estimatedDuration} min</p>
                      {task.deadline && (
                        <p>Deadline: {task.deadline.toLocaleDateString()}</p>
                      )}
                    </CardContent>
                    <CardFooter>
                      <Badge
                        variant={
                          task.priority === "high"
                            ? "destructive"
                            : task.priority === "medium"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        Priorität: {task.priority}
                      </Badge>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </section>

            {/* --- GEWOHNHEITEN --- */}
            <section id="habits">
              <h2 className="mb-4 text-2xl font-semibold">Gewohnheiten</h2>
              <div className="flex flex-col gap-4">
                {habits.map((habit) => (
                  <Card key={habit.id} className="bg-card/50">
                    <CardHeader>
                      <CardTitle>{habit.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>Dauer: {habit.duration} min</p>
                      <p>Frequenz: {habit.frequency === "daily" ? "Täglich" : `${habit.timesPerWeek ?? 1}x pro Woche`}</p>
                      <p>Wann: {habit.preferredTime}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}