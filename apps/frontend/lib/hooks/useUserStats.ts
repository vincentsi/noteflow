import { useQuery } from '@tanstack/react-query'
import { usersApi, type UserStats } from '@/lib/api/users'

export function useUserStats() {
  return useQuery<UserStats, Error>({
    queryKey: ['user-stats'],
    queryFn: () => usersApi.getStats(),
    staleTime: 60000, // 1 minute
  })
}
