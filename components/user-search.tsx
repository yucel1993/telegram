"use client"

import type React from "react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, UserPlus } from "lucide-react"
import { searchUsers, createChat } from "@/app/actions/users"

interface UserSearchProps {
  userId: string
  onSelectUser: (chatId: string) => void
}

export default function UserSearch({ userId, onSelectUser }: UserSearchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!searchQuery.trim()) return

    setLoading(true)
    setSearched(true)

    try {
      const results = await searchUsers({
        userId,
        query: searchQuery,
      })
      setSearchResults(results)
    } catch (error) {
      console.error("Error searching users:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartChat = async (otherUserId: string) => {
    try {
      const chatId = await createChat({
        userId,
        otherUserId,
      })

      if (chatId) {
        onSelectUser(chatId)
      }
    } catch (error) {
      console.error("Error creating chat:", error)
    }
  }

  return (
    <div className="p-4">
      <form onSubmit={handleSearch} className="flex space-x-2 mb-4">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by username..."
          className="flex-1"
        />
        <Button type="submit" disabled={loading || !searchQuery.trim()}>
          <Search className="h-4 w-4" />
        </Button>
      </form>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-md"></div>
          ))}
        </div>
      ) : searched ? (
        searchResults.length > 0 ? (
          <div className="space-y-2">
            {searchResults.map((user) => (
              <div key={user._id} className="p-3 bg-gray-50 rounded-md flex justify-between items-center">
                <div>
                  <div className="font-medium">{user.username}</div>
                  <div className="text-sm text-gray-500">
                    {user.lastActive
                      ? `Last active: ${new Date(user.lastActive).toLocaleDateString()}`
                      : "Never active"}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleStartChat(user._id)}>
                  <UserPlus className="h-4 w-4 mr-1" />
                  Chat
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 p-4">No users found matching "{searchQuery}"</div>
        )
      ) : null}
    </div>
  )
}
