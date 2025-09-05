import { redirect } from "next/navigation"
import { steps } from "./steps"

export async function GET() {
    redirect(`/onboarding${steps[0].route}`)
}