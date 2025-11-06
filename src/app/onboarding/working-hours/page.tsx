"use client"
import { useRouter } from "next/navigation"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { api } from "@/trpc/react"
import { steps } from "../steps"
import { useForm, type UseFormReturn } from "react-hook-form"
import { WorkingHoursSchema, type WorkingHours, weekdays } from "@/lib/zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { FieldSet, Field, FieldLegend, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { OnboardingNavigation } from "../OnboardingNavigation"
import { motion } from "framer-motion"
import { useState } from "react"


export default function WorkingHoursPage() {
  const [loading, setLoading] = useState(false)
  const currentStep = steps[1]
  const router = useRouter()
  const saveWorkingHours = api.onboarding.saveWorkingHours.useMutation({
    onMutate: () => setLoading(true),
    onSuccess: () => router.push("/onboarding/preferences"),
    onError: (error) => toast.error(error.message)
  })

  const form = useForm<WorkingHours>({
    resolver: zodResolver(WorkingHoursSchema),
    defaultValues: {
      earliestTime: "09:00",
      latestTime: "17:00",
      workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
    },
  })


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
        className="mb-10 text-gray-600"
      >
        {currentStep.description}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values => saveWorkingHours.mutateAsync(values)))} className="space-y-12">
            <WorkingTimeRange form={form} stepSize={15} />
            <WorkingDays form={form} />
            <OnboardingNavigation className="mt-12" nextDisabled={loading} nextText={loading ? "Saving..." : "Continue"} />
          </form>
        </Form>
      </motion.div>
    </>
  )
}

function WorkingTimeRange({ form, stepSize }: { form: UseFormReturn<WorkingHours>, stepSize: number }) {
  const timeToSliderValue = (time: string) => {
    const [h, m] = time.split(":").map(Number)
    return (h ?? 0) * 60 + (m ?? 0)
  }
  const sliderValueToTime = (value: number) => {
    const h = Math.floor(value / 60)
    const m = value % 60
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
  }

  const handleRangeChange = (range: number[]) => {
    const [start, end] = range
    if (!start || !end) return
    if (end - start < 60) return // min 60 minutes apart
    form.setValue("earliestTime", sliderValueToTime(start))
    form.setValue("latestTime", sliderValueToTime(end))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
    >
      <FieldSet className="grid grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-100">
        <FieldLegend>
          Your focus window
        </FieldLegend>
        <FormField
          control={form.control}
          name="earliestTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start</FormLabel>
              <FormControl>
                <Input
                  type="time"
                  step={stepSize * 60}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="latestTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>End</FormLabel>
              <FormControl>
                <Input
                  type="time"
                  step={stepSize * 60}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Slider
          value={[timeToSliderValue(form.watch("earliestTime")), timeToSliderValue(form.watch("latestTime"))]}
          min={0}
          max={24 * 60 - 1}
          step={stepSize}
          onValueChange={handleRangeChange}
          className="col-span-2"
        />
      </FieldSet>
    </motion.div>
  )
}


function WorkingDays({ form }: { form: UseFormReturn<WorkingHours> }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
    >
      <FieldSet>
        <FieldLegend variant="label">Work days</FieldLegend>
        <FieldDescription>Choose the days you want to schedule focus blocks.</FieldDescription>
        <FieldGroup className="flex gap-3 flex-row">
          {weekdays.map((day, index) => {
            const checked = form.watch("workingDays").includes(day)
            return (
              <motion.div
                key={day}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.05, duration: 0.4, ease: "easeOut" }}
              >
                <Field className="w-10">
                  <FieldLabel htmlFor={`working-days-${day}`} className={cn("aspect-square rounded-full border text-sm font-medium justify-center transition-colors hover:cursor-pointer hover:bg-accent hover:text-accent-foreground", checked && "border-primary bg-primary text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground")}>
                    {day[0]}
                  </FieldLabel>
                  <Checkbox
                    id={`working-days-${day}`}
                    checked={checked}
                    onCheckedChange={(next) => {
                      form.setValue("workingDays",
                        next.valueOf() ?
                          [...form.watch("workingDays"), day] :
                          form.watch("workingDays").filter((d) => d !== day))
                    }}
                    className="sr-only"
                  />
                </Field>
              </motion.div>
            )
          })}
        </FieldGroup>
      </FieldSet>
    </motion.div>
  )
}