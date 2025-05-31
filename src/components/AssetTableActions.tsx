'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface AssetTableActionsProps {
  assetId: string
}

export default function AssetTableActions({ assetId }: AssetTableActionsProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this asset?')) {
      return
    }

    setIsDeleting(true)
    try {
      // TODO: Replace with actual API call
      console.log('Deleting asset:', assetId)
      // await fetch(`/api/assets/${assetId}`, {
      //   method: 'DELETE',
      // })

      // Refresh the page to show updated list
      router.refresh()
    } catch (error) {
      console.error('Error deleting asset:', error)
      alert('Failed to delete asset. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex justify-end space-x-2">
      <Link
        href={`/dashboard/assets/${assetId}/edit`}
        className="text-blue-600 hover:text-blue-900"
      >
        Edit
      </Link>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className={`text-red-600 hover:text-red-900 ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isDeleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  )
} 