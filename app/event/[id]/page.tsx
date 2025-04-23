import { redirect } from "next/navigation"
import { getCurrentUser } from "@/app/actions/auth"
import EventDetail from "@/components/event-detail"

export default async function EventPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/")
  }

  return <EventDetail userId={user.id} eventId={params.id} />
}
