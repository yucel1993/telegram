"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Calendar, Search, User, Settings, ArrowLeft, Menu, X } from "lucide-react"
import CreateEventForm from "@/components/create-event-form"
import FindEvents from "@/components/find-events"
import MyEvents from "@/components/my-events"
import ManageEvents from "@/components/manage-events"
import { useRouter } from "next/navigation"
import { useMobile } from "@/hooks/use-mobile"

interface EventsInterfaceProps {
  userId: string
  username: string
}

export default function EventsInterface({ userId, username }: EventsInterfaceProps) {
  const [activeSection, setActiveSection] = useState<"create" | "find" | "my" | "manage">("find")
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const isMobile = useMobile()

  // Close menu when switching to desktop view
  useEffect(() => {
    if (!isMobile) {
      setMenuOpen(false)
    }
  }, [isMobile])

  const handleSectionChange = (section: "create" | "find" | "my" | "manage") => {
    setActiveSection(section)
    if (isMobile) {
      setMenuOpen(false)
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100">
      {/* Mobile header */}
      {isMobile && (
        <div className="bg-white p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold">Events</h2>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={() => router.push("/chat")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      )}

      {/* Left sidebar - desktop or mobile menu */}
      {(!isMobile || menuOpen) && (
        <div
          className={`${
            isMobile
              ? "absolute top-[61px] left-0 right-0 z-50 bg-white border-b border-gray-200"
              : "w-64 bg-white border-r border-gray-200 flex flex-col"
          }`}
        >
          {!isMobile && (
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Events</h2>
                <Button variant="ghost" size="sm" onClick={() => router.push("/chat")}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="p-4 space-y-2">
            <Button
              variant={activeSection === "create" ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => handleSectionChange("create")}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Create Event
            </Button>
            <Button
              variant={activeSection === "find" ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => handleSectionChange("find")}
            >
              <Search className="h-4 w-4 mr-2" />
              Find Events
            </Button>
            <Button
              variant={activeSection === "my" ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => handleSectionChange("my")}
            >
              <User className="h-4 w-4 mr-2" />
              My Events
            </Button>
            <Button
              variant={activeSection === "manage" ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => handleSectionChange("manage")}
            >
              <Settings className="h-4 w-4 mr-2" />
              Management
            </Button>
          </div>
        </div>
      )}

      {/* Right content area */}
      <div className={`flex-1 overflow-y-auto ${isMobile && menuOpen ? "hidden" : "block"}`}>
        {activeSection === "create" && <CreateEventForm userId={userId} />}
        {activeSection === "find" && <FindEvents userId={userId} />}
        {activeSection === "my" && <MyEvents userId={userId} />}
        {activeSection === "manage" && <ManageEvents userId={userId} />}
      </div>
    </div>
  )
}
