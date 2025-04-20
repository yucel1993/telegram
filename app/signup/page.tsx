import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import SignupForm from "@/components/signup-form"

export default function SignupPage() {
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
          <h1 className="text-3xl font-bold text-gray-800">Create an Account</h1>
          <p className="text-gray-600 mt-2">Join our chat community</p>
        </div>
        <SignupForm />
        <div className="mt-4 text-center">
          <p className="text-gray-600">
            Already have an account?{" "}
            <a href="/" className="text-blue-600 hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}
