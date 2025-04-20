import { redirect } from "next/navigation"
import ChatInterface from "@/components/chat-interface"
import { getCurrentUser } from "@/app/actions/auth"

export default async function ChatPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/")
  }

  return <ChatInterface userId={user.id} username={user.username} />
}
