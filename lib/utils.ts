export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-ZW', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function buildWhatsAppLink(params: {
  id: string
  item: string
  location: string
  category: string
  siteUrl?: string
}): string {
  const siteUrl = params.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mbaredirect.co.zw'
  const text = encodeURIComponent(
    `🛒 *Mbare Direct Request*\n📦 Item: ${params.item}\n📍 Location: ${params.location}\n🏷️ Category: ${params.category}\n👉 Join at: ${siteUrl}/requests/${params.id}`,
  )
  return `https://wa.me/?text=${text}`
}

export function categoryEmoji(category: string): string {
  switch (category) {
    case 'Agriculture':
      return '🌽'
    case 'Construction':
      return '🏗️'
    case 'Transport':
      return '🚛'
    default:
      return '📦'
  }
}
