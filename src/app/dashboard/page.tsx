import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "../api/auth/[...nextauth]/route"
import Link from "next/link"

export default async function Dashboard() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  const menuItems = [
    {
      title: "Assets",
      description: "Manage your assets inventory",
      href: "/dashboard/assets",
      icon: "📦",
    },
    {
      title: "Categories",
      description: "Organize assets by categories",
      href: "/dashboard/categories",
      icon: "🏷️",
    },
    {
      title: "Users",
      description: "Manage user access and permissions",
      href: "/dashboard/users",
      icon: "👥",
    },
    {
      title: "Reports",
      description: "View asset reports and analytics",
      href: "/dashboard/reports",
      icon: "📊",
    },
    {
      title: "Settings",
      description: "Configure application settings",
      href: "/dashboard/settings",
      icon: "⚙️",
    },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {menuItems.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="block p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
          >
            <div className="flex items-center space-x-4">
              <span className="text-3xl">{item.icon}</span>
              <div>
                <h2 className="text-lg font-medium text-gray-900">{item.title}</h2>
                <p className="mt-1 text-sm text-gray-500">{item.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
} 