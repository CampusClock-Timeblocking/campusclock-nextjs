"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import {
  BatteryCharging,
  Loader2,
  Moon,
  Sun,
  Sunrise,
  type LucideIcon,
} from "lucide-react";
import {
  PreferencesInput,
  type Preferences,
  type energyProfiles,
} from "@/lib/zod";
import { energyPresets } from "@/lib/energy-presets";
import type { WorkingPreferences } from "@prisma/client";

type EnergyProfile = (typeof energyProfiles)[number];

const profileCards: Array<{
  key: EnergyProfile;
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    key: "EARLY_BIRD",
    title: "Morning warrior",
    description:
      "Peak performance at dawn. We'll schedule your most challenging work in the morning.",
    icon: Sunrise,
  },
  {
    key: "BALANCED",
    title: "Steady performer",
    description:
      "Consistent energy all day. Perfect for structured work with predictable focus blocks.",
    icon: Sun,
  },
  {
    key: "NIGHT_OWL",
    title: "Evening innovator",
    description:
      "Creative genius after sunset. We'll save your deep work for when you're most inspired.",
    icon: Moon,
  },
];

interface EnergyProfileCardProps {
  preferences: WorkingPreferences | null | undefined;
  isLoading: boolean;
  onSave: (values: Preferences) => Promise<unknown>;
  isSaving: boolean;
}

function inferProfileFromAlertness(alertness: number[]): EnergyProfile {
  let best: EnergyProfile = "BALANCED";
  let bestDist = Infinity;

  for (const [key, preset] of Object.entries(energyPresets) as [
    EnergyProfile,
    number[],
  ][]) {
    const dist = preset.reduce(
      (sum, v, i) => sum + (v - (alertness[i] ?? 0.5)) ** 2,
      0,
    );
    if (dist < bestDist) {
      bestDist = dist;
      best = key;
    }
  }
  return best;
}

export function EnergyProfileCard({
  preferences,
  isLoading,
  onSave,
  isSaving,
}: EnergyProfileCardProps) {
  const currentProfile = useMemo(
    () =>
      preferences?.alertnessByHour?.length === 24
        ? inferProfileFromAlertness(preferences.alertnessByHour)
        : "BALANCED",
    [preferences],
  );

  const form = useForm<Preferences>({
    resolver: zodResolver(PreferencesInput),
    defaultValues: { energyProfile: "BALANCED" },
  });

  const { isDirty } = form.formState;

  // Sync form when server data arrives
  useEffect(() => {
    form.reset({ energyProfile: currentProfile });
  }, [currentProfile, form]);

  return (
    <div className="border-border space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="border-border shrink-0 rounded-sm border"
            style={{ padding: 6 }}
          >
            <BatteryCharging size={30} />
          </div>
          <div className="flex flex-col justify-center">
            <h3 className="text-lg font-semibold">Energy Profile</h3>
            <p className="text-muted-foreground text-sm">
              Tell us when you&apos;re at your best
            </p>
          </div>
        </div>
        {isDirty && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => form.reset()}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isSaving}
              onClick={form.handleSubmit((v) => onSave(v))}
            >
              {isSaving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Save
            </Button>
          </div>
        )}
      </div>
      <Separator />

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : (
        <Form {...form}>
          <form className="space-y-4">
            <EnergyProfileSelector form={form} idPrefix="settings" />
          </form>
        </Form>
      )}
    </div>
  );
}

export function EnergyProfileSelector({
  form,
  idPrefix = "settings",
}: {
  form: ReturnType<typeof useForm<Preferences>>;
  idPrefix?: string;
}) {
  return (
    <FormField
      control={form.control}
      name="energyProfile"
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <FieldGroup>
              <FieldSet>
                <FieldLegend>Energy profile</FieldLegend>
                <FieldDescription>
                  We schedule your most important work when you&apos;re
                  naturally at your best.
                </FieldDescription>
                <RadioGroup
                  value={field.value}
                  onValueChange={(v) => field.onChange(v as EnergyProfile)}
                  className="mt-2 gap-4"
                >
                  {profileCards.map((card) => {
                    const id = `${idPrefix}-energy-${card.key}`;
                    return (
                      <FieldLabel
                        key={card.key}
                        htmlFor={id}
                        className="transition-colors"
                      >
                        <Field orientation="horizontal">
                          <card.icon className="text-muted-foreground size-6" />
                          <FieldContent>
                            <FieldTitle>{card.title}</FieldTitle>
                            <FieldDescription>
                              {card.description}
                            </FieldDescription>
                          </FieldContent>
                          <RadioGroupItem value={card.key} id={id} />
                        </Field>
                      </FieldLabel>
                    );
                  })}
                </RadioGroup>
              </FieldSet>
            </FieldGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
