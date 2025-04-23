"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar, Search, User, Settings, ArrowLeft } from "lucide-react"
import CreateEventForm from "@/components/create-event-form"
import FindEvents from "@/components/find-events"
import MyEvents from "@/components/my-events"
import ManageEvents from "@/components/manage-events"
import { useRouter } from "next/navigation"

interface EventsInterfaceProps {
  userId: string
  username: string
}

export default function EventsInterface({ userId, username }: EventsInterfaceProps) {
  const [activeSection, setActiveSection] = useState<"create" | "find" | "my" | "manage">("find")
  const router = useRouter()

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Events</h2>
            <Button variant="ghost" size="sm" onClick={() => router.push("/chat")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-2">
          <Button
            variant={activeSection === "create" ? "default" : "outline"}
            className="w-full justify-start"
            onClick={() => setActiveSection("create")}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Create Event
          </Button>
          <Button
            variant={activeSection === "find" ? "default" : "outline"}
            className="w-full justify-start"
            onClick={() => setActiveSection("find")}
          >
            <Search className="h-4 w-4 mr-2" />
            Find Events
          </Button>
          <Button
            variant={activeSection === "my" ? "default" : "outline"}
            className="w-full justify-start"
            onClick={() => setActiveSection("my")}
          >
            <User className="h-4 w-4 mr-2" />
            My Events
          </Button>
          <Button
            variant={activeSection === "manage" ? "default" : "outline"}
            className="w-full justify-start"
            onClick={() => setActiveSection("manage")}
          >
            <Settings className="h-4 w-4 mr-2" />
            Management
          </Button>
        </div>
      </div>

      {/* Right content area */}
      <div className="flex-1 overflow-y-auto">
        {activeSection === "create" && <CreateEventForm userId={userId} />}
        {activeSection === "find" && <FindEvents userId={userId} />}
        {activeSection === "my" && <MyEvents userId={userId} />}
        {activeSection === "manage" && <ManageEvents userId={userId} />}
      </div>
    </div>
  )
}
