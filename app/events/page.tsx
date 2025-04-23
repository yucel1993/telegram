import { redirect } from "next/navigation"
import { getCurrentUser } from "@/app/actions/auth"
import EventsInterface from "@/components/events-interface"

export default async function EventsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/")
  }

  return <EventsInterface userId={user.id} username={user.username} />
}
