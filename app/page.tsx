import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import LoginForm from "@/components/login-form"

export default function Home() {
  // Check if user is already logged in
  const cookieStore = cookies()
  const isLoggedIn = cookieStore.has("user_session")

  if (isLoggedIn) {
    redirect("/chat")
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Welcome to ChatApp</h1>
          <p className="text-gray-600 mt-2">Sign in to start chatting</p>
        </div>
        <LoginForm />
        <div className="mt-4 text-center">
          <p className="text-gray-600">
            Don't have an account?{" "}
            <a href="/signup" className="text-blue-600 hover:underline">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}
