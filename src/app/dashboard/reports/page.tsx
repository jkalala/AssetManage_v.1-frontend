import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '../../../../lib/prisma'
import type { Prisma } from '@prisma/client'

interface AssetStats {
  totalAssets: number
  totalValue: number
  byStatus: {
    available: number
    inUse: number
    maintenance: number
    retired: number
  }
  byCategory: {
    categoryName: string
    count: number
    value: number
  }[]
  recentActivity: {
    date: Date
    action: string
    assetName: string
    user: string
  }[]
}

async function getAssetStats(session: any): Promise<AssetStats> {
  try {
    if (!session?.user?.id) {
      throw new Error('Unauthorized - No valid session')
    }

    // Get all assets with their categories and users
    const assets = await prisma.$queryRaw<Array<{
      id: string
      name: string
      status: string
      value: number
      updatedAt: Date
      categoryName: string
      userFirstName: string | null
      userLastName: string | null
    }>>`
      SELECT 
        a.id,
        a.name,
        a.status,
        a.value,
        a.updated_at as "updatedAt",
        c.name as "categoryName",
        u.first_name as "userFirstName",
        u.last_name as "userLastName"
      FROM "Asset" a
      LEFT JOIN "Category" c ON a."categoryId" = c.id
      LEFT JOIN "User" u ON a."createdBy" = u.id
      ORDER BY a.updated_at DESC
    `

    // Calculate totals
    const totalAssets = assets.length
    const totalValue = assets.reduce((sum, asset) => sum + Number(asset.value), 0)

    // Calculate status distribution
    const byStatus = {
      available: assets.filter(a => a.status === 'available').length,
      inUse: assets.filter(a => a.status === 'in-use').length,
      maintenance: assets.filter(a => a.status === 'maintenance').length,
      retired: assets.filter(a => a.status === 'retired').length
    }

    // Calculate category distribution
    const categoryMap = new Map<string, { count: number; value: number }>()
    assets.forEach(asset => {
      const categoryName = asset.categoryName
      const current = categoryMap.get(categoryName) || { count: 0, value: 0 }
      categoryMap.set(categoryName, {
        count: current.count + 1,
        value: current.value + Number(asset.value)
      })
    })

    const byCategory = Array.from(categoryMap.entries()).map(([categoryName, stats]) => ({
      categoryName,
      count: stats.count,
      value: stats.value
    }))

    // Get recent activity
    const recentActivity = assets
      .slice(0, 10)
      .map(asset => ({
        date: asset.updatedAt,
        action: 'Updated',
        assetName: asset.name,
        user: asset.userFirstName && asset.userLastName 
          ? `${asset.userFirstName} ${asset.userLastName}`
          : 'Unknown'
      }))

    return {
      totalAssets,
      totalValue,
      byStatus,
      byCategory,
      recentActivity
    }
  } catch (error) {
    console.error('Error fetching asset stats:', error)
    throw error
  }
}

export default async function ReportsPage() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      redirect("/auth/signin")
    }

    const stats = await getAssetStats(session)

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">Asset Reports</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-3xl">📦</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Assets</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalAssets}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-3xl">💰</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Value</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      ${stats.totalValue.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-3xl">✅</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Available Assets</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.byStatus.available}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-3xl">👥</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Assets in Use</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.byStatus.inUse}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Asset Status Distribution</h2>
          <div className="bg-white shadow rounded-lg p-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <div className="text-sm font-medium text-gray-500">Available</div>
                <div className="mt-1 text-2xl font-semibold text-blue-600">{stats.byStatus.available}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">In Use</div>
                <div className="mt-1 text-2xl font-semibold text-green-600">{stats.byStatus.inUse}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Maintenance</div>
                <div className="mt-1 text-2xl font-semibold text-yellow-600">{stats.byStatus.maintenance}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Retired</div>
                <div className="mt-1 text-2xl font-semibold text-red-600">{stats.byStatus.retired}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Assets by Category</h2>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Count
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.byCategory.map((category) => (
                  <tr key={category.categoryName}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {category.categoryName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${category.value.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asset
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.recentActivity.map((activity, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {activity.date.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {activity.action}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {activity.assetName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {activity.user}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error in ReportsPage:', error)
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading reports
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  {error instanceof Error ? error.message : 'An unexpected error occurred'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
} 