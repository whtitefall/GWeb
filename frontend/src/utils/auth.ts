export const resolveAuthName = (session: {
  user?: { user_metadata?: { full_name?: string }; email?: string }
} | null) => {
  const fullName = session?.user?.user_metadata?.full_name?.trim()
  if (fullName) {
    return fullName
  }
  const email = session?.user?.email
  return email ? email.split('@')[0] || 'Graph Maker' : 'Graph Maker'
}
