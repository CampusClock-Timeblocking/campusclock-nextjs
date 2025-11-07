"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { api } from "@/trpc/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle } from "@/components/ui/field"
import { OnboardingNavigation } from "../OnboardingNavigation"
import { Sun, Moon, Sunrise, type LucideIcon } from "lucide-react"
import { PreferencesInput, type Preferences, type energyProfiles } from "@/lib/zod"
import { steps } from "../steps"

type EnergyProfile = typeof energyProfiles[number]


export default function PreferencesPage() {
  const [loading, setLoading] = useState(false)
  const form = useForm<Preferences>({ resolver: zodResolver(PreferencesInput), defaultValues: { energyProfile: "BALANCED" } })
  const router = useRouter()
  const savePreferences = api.onboarding.savePreferences.useMutation({
    onMutate: () => setLoading(true),
    onSuccess: () => router.push("/dashboard"),
    onError: (error) => toast.error(error.message)
  })

  const cards: Array<{ key: EnergyProfile; title: string; description: string; icon: LucideIcon }> = [
    { key: "EARLY_BIRD", title: "Morning warrior", description: "Peak performance at dawn. We'll schedule your most challenging work in the morning.", icon: Sunrise },
    { key: "BALANCED", title: "Steady performer", description: "Consistent energy all day. Perfect for structured work with predictable focus blocks.", icon: Sun },
    { key: "NIGHT_OWL", title: "Evening innovator", description: "Creative genius after sunset. We'll save your deep work for when you're most inspired.", icon: Moon },
  ] as const

  const currentStep = steps[2]

  return (
    <>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mb-2 text-3xl font-semibold text-gray-700 dark:text-gray-100 sm:text-4xl"
      >
        {currentStep.title}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
        className="mb-10 text-muted-foreground"
      >
        {currentStep.description}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(values => savePreferences.mutateAsync(values))} className="space-y-6">
            <FormField
              control={form.control}
              name="energyProfile"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <FieldGroup>
                      <FieldSet>
                        <FieldLegend>
                          Energy profile
                        </FieldLegend>
                        <FieldDescription>
                          We schedule your most important work when you&apos;re naturally at your best.
                        </FieldDescription>
                        <RadioGroup
                          value={field.value}
                          onValueChange={(v) => { field.onChange(v as EnergyProfile) }}
                          className="mt-2 gap-4"
                        >
                          {cards.map((card, index) => {
                            const id = `energy-${card.key}`
                            return (
                              <motion.div
                                key={card.key}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 + index * 0.1, duration: 0.5, ease: "easeOut" }}
                              >
                                <FieldLabel htmlFor={id} className="transition-colors">
                                  <Field orientation="horizontal">
                                    <card.icon className="size-6 text-muted-foreground" />
                                    <FieldContent>
                                      <FieldTitle>{card.title}</FieldTitle>
                                      <FieldDescription>{card.description}</FieldDescription>
                                    </FieldContent>
                                    <RadioGroupItem value={card.key} id={id} />
                                  </Field>
                                </FieldLabel>
                              </motion.div>
                            )
                          })}
                        </RadioGroup>
                      </FieldSet>
                    </FieldGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5, ease: "easeOut" }}
            >
              <OnboardingNavigation
                nextText={loading ? "Creating your plan..." : "Create optimized schedule"}
                nextDisabled={loading}
                className="mt-12"
                isLastStep={true}
              />
            </motion.div>
          </form>
        </Form>
      </motion.div>
    </>
  )
}
