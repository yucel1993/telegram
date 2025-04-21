"use client"

import type React from "react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, UserPlus, Users } from "lucide-react"
import { searchUsersAndGroups, createChat } from "@/app/actions/users"
import { joinGroup } from "@/app/actions/groups"

interface UserSearchProps {
  userId: string
  onSelectUser: (chatId: string) => void
}

export default function UserSearch({ userId, onSelectUser }: UserSearchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<{
    users: any[]
    groups: any[]
  }>({ users: [], groups: [] })
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [creatingChat, setCreatingChat] = useState<Record<string, boolean>>({})
  const [joiningGroup, setJoiningGroup] = useState<Record<string, boolean>>({})

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!searchQuery.trim()) return

    setLoading(true)
    setSearched(true)

    try {
      const results = await searchUsersAndGroups({
        userId,
        query: searchQuery,
      })
      setSearchResults(results)
    } catch (error) {
      console.error("Error searching:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartChat = async (otherUserId: string) => {
    try {
      setCreatingChat((prev) => ({ ...prev, [otherUserId]: true }))

      const chatId = await createChat({
        userId,
        otherUserId,
      })

      if (chatId) {
        onSelectUser(chatId)
      } else {
        console.error("Failed to create chat - no chat ID returned")
      }
    } catch (error) {
      console.error("Error creating chat:", error)
    } finally {
      setCreatingChat((prev) => ({ ...prev, [otherUserId]: false }))
    }
  }

  const handleJoinGroup = async (groupId: string) => {
    try {
      setJoiningGroup((prev) => ({ ...prev, [groupId]: true }))

      const result = await joinGroup({
        userId,
        chatId: groupId,
      })

      if (result.success) {
        onSelectUser(groupId)
      } else {
        console.error("Failed to join group:", result.error)
      }
    } catch (error) {
      console.error("Error joining group:", error)
    } finally {
      setJoiningGroup((prev) => ({ ...prev, [groupId]: false }))
    }
  }

  const hasResults = searchResults.users.length > 0 || searchResults.groups.length > 0

  return (
    <div className="p-4">
      <form onSubmit={handleSearch} className="flex space-x-2 mb-4">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users or groups..."
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
        hasResults ? (
          <div className="space-y-4">
            {/* Users section */}
            {searchResults.users.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Users</h3>
                <div className="space-y-2">
                  {searchResults.users.map((user) => (
                    <div key={user._id} className="p-3 bg-gray-50 rounded-md flex justify-between items-center">
                      <div>
                        <div className="font-medium">{user.username}</div>
                        <div className="text-sm text-gray-500">
                          {user.lastActive
                            ? `Last active: ${new Date(user.lastActive).toLocaleDateString()}`
                            : "Never active"}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartChat(user._id)}
                        disabled={creatingChat[user._id]}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        {creatingChat[user._id] ? "Opening..." : "Chat"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Groups section */}
            {searchResults.groups.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Groups</h3>
                <div className="space-y-2">
                  {searchResults.groups.map((group) => (
                    <div key={group._id} className="p-3 bg-gray-50 rounded-md flex justify-between items-center">
                      <div>
                        <div className="font-medium flex items-center">
                          <Users className="h-4 w-4 mr-1 text-gray-500" />
                          {group.name || "Unnamed Group"}
                        </div>
                        {group.description && (
                          <div className="text-sm text-gray-600 mt-1 truncate">{group.description}</div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          {group.participantsCount} {group.participantsCount === 1 ? "member" : "members"}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleJoinGroup(group._id)}
                        disabled={joiningGroup[group._id]}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        {joiningGroup[group._id] ? "Joining..." : "Join"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500 p-4">No users or groups found matching "{searchQuery}"</div>
        )
      ) : null}
    </div>
  )
}
