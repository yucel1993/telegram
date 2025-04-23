import { redirect } from "next/navigation"
import { getCurrentUser } from "@/app/actions/auth"
import EditEventForm from "@/components/edit-event-form"

export default async function EditEventPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/")
  }

  return <EditEventForm userId={user.id} eventId={params.id} />
}
