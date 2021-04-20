import DataLoader from 'dataloader'
import { Updoot } from '../entities/updoot'

// [{postId: 5, userId: 10}]
// [{postId: 5, userId: 10, value: 1}]
export const createUpdootLoader = () =>
  // users don't always vote so, some queries will be null
  new DataLoader<{ postId: number; userId: number }, Updoot | null>(
    async (keys) => {
      const updoots = await Updoot.findByIds(keys as any)
      const updootIdsToUpdoot: Record<string, Updoot> = {}
      updoots.forEach((updoot) => {
        updootIdsToUpdoot[`${updoot.userId}|${updoot.postId}`] = updoot
      })
      // | is a part of the string and not the union

      return keys.map((key) => updootIdsToUpdoot[`${key.userId}|${key.postId}`])
    }
  )
