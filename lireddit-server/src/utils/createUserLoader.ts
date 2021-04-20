import DataLoader from 'dataloader'
import { User } from '../entities/Users'

// [1, 78, 8, 9]
//users:  [{id: 1, username: 'tim'}, {}, {}, {}]
//  new DataLoader<Key, return value for each load>
export const createUserLoader = () =>
  new DataLoader<number, User>(async (userIds) => {
    const users = await User.findByIds(userIds as number[]) // get all users in one SQL

    /*Users: [
  User {
    id: 1,
    username: 'shriram',
    email: 'sarananshriram80@gmail.com',
    password: '$argon2i$v=19$m=4096,t=3,p=1$DsOKGEZzeaNn3caALGn/Sg$ft/IU3f22OdRpIqsdZ3fT5tpnn2QMptLWfTEdkDnDDg',
    createdAt: 2021-02-22T11:11:07.363Z,
    updatedAt: 2021-02-22T11:11:07.363Z
  },
  User {
    id: 2,
    username: 'bob3',
    email: 'bob@bob.com',
    password: '$argon2i$v=19$m=4096,t=3,p=1$w0Ilg7Upll6FUWq/Sss9/Q$CZUr++P09QKrOQSoNNQAI3Jqnj4YVjERV1yCueqiNGQ',
    createdAt: 2021-02-24T04:44:42.207Z,
    updatedAt: 2021-02-24T04:44:42.207Z
  }
]*/
    // we need to change the ordered user's index have the same index as the incoming UserIds
    const userIdToUser: Record<number, User> = {}
    users.forEach((u) => {
      userIdToUser[u.id] = u
    })

    const sortedUsers = userIds.map((userId) => userIdToUser[userId])
    // to have the value's index correspond to keys index

    return sortedUsers
  })

//DataLoader is used to avoid multiple same SQL queries or n+1 problem

//the above function accepts an Array of keys, and returns a Promise which resolves to an Array of values*.

//DataLoader's load method will collect all individual loads which occur within a single thread or consecutive and then call your batch function with all requested keys.

//Subsequent calls to .load() with the same key will result in that key not appearing in the keys provided to your batch function. However, the resulting Promise will still wait on the current batch to complete. This way both cached and uncached requests will resolve at the same time, allowing DataLoader optimizations for subsequent dependent loads.

// rules
// The Array of values must be the same length as the Array of keys.
// Each index in the Array of values must correspond to the same index in the Array of keys.
