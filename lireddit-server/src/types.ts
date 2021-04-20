import { Request, Response } from 'express'
import session from 'express-session'
import { Redis } from 'ioredis'
import { createUpdootLoader } from './utils/createUpdootLoader'
import { createUserLoader } from './utils/createUserLoader'

declare module 'express-session' {
  interface SessionData {
    userId: number
  }
}

export type MyContext = {
  req: Request & {
    session: session.Session & Partial<session.SessionData>
  }
  res: Response
  redis: Redis
  userLoader: ReturnType<typeof createUserLoader> // type of returned value
  updootLoader: ReturnType<typeof createUpdootLoader>
}
// this is em's type

//intersection type

//interface ErrorHandling {
//   success: boolean;
//   error?: { message: string };
// }

// interface ArtistsData {
//   artists: { name: string }[];
// }

// type ArtistsResponse = ArtistsData & ErrorHandling; // anything of this type can access the props of the above interface

// const handleArtistsResponse = (response: ArtistsResponse) => {
//   if (response.error) {
//     console.error(response.error.message);
//     return;
//   }

//   console.log(response.artists);
// };
