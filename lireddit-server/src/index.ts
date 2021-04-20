import { ApolloServer } from 'apollo-server-express'
import connectRedis from 'connect-redis'
import cors from 'cors'
import express from 'express'
import session from 'express-session'
// reinstall this package and class-validator if class-valudator is not found error
import Redis from 'ioredis'
import path from 'path'
import 'reflect-metadata'
import { buildSchema } from 'type-graphql'
import { createConnection } from 'typeorm'
import { COOKIE_NAME, __prod__ } from './constants'
import { Post } from './entities/post'
import { Updoot } from './entities/updoot'
import { User } from './entities/Users'
import { PostResolver } from './resolvers/post'
import { UserResolver } from './resolvers/user'
// end
import { MyContext } from './types'
import { createUpdootLoader } from './utils/createUpdootLoader'
import { createUserLoader } from './utils/createUserLoader'
// app.use is for using middleware don't use them after route

//to see how grahQL fetch data go to graphql server folder

const main = async () => {
  const conn = await createConnection({
    type: 'postgres',
    database: 'lireddit3',
    username: 'postgres',
    password: 'postgres',
    logging: true,
    synchronize: true, //  Indicates if database schema should be auto created on every application launch.
    migrations: [path.join(__dirname, './migrations/*')], // current dir + /migrations/*
    entities: [Post, User, Updoot],
  })

  // await Post.delete({})

  await conn.runMigrations() // this for running the custom migrations in migration folder.
  // if migrations didn't run then del the file and close server and restart
  // the path is in 'migrations property in the above'
  const app = express()

  const RedisStore = connectRedis(session)
  const redis = new Redis()
  app.use(
    cors({
      origin: 'http://localhost:3000',
      credentials: true,
    })
  ) // seeting cors with cors package helps us with applying this in all routes

  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redis,
        disableTouch: true,
        disableTTL: true,
        // If the session cookie has a expires date, connect-redis will use it as the TTL.
        //Otherwise, it will expire the session using the ttl option (default: 86400 seconds or one day).
        //the TTL is reset every time a user interacts with the server. we are disabling this with disable touch since the session is for a day by default.
      }),
      cookie: {
        maxAge: 1000 * 60 * 24 * 365 * 10, //10year is for expiring the cookie
        httpOnly: true, // doesn't allow front-end to access cookie
        secure: __prod__, // HTTPS is necessary for secure cookies. If secure is set, and you access your site over HTTP, the cookie will not be set.
        sameSite: 'lax', //csrf
      },
      secret: 'sfgsdgssgsggsdgdsgsdvwrwg',
      resave: false, //Forces the session to be saved back to the session store, even if the session was never modified during the request
      saveUninitialized: false, // true: Forces a session that is "uninitialized" to be saved to the store. A session is uninitialized when it is new but not modified.
    })
  )
  // syntax: name of cookie/session, storage, secret key, hover over resave for more info

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }): MyContext => ({
      req,
      res,
      redis,
      userLoader: createUserLoader(),
      updootLoader: createUpdootLoader(),
    }),

    //context is accessible by all resolver. ({}) this syntax is for returning a sth that covers too many lines like react-html return. this is object syntax
  })

  apolloServer.applyMiddleware({
    app,
    cors: false, // The GraphQL middleware was over-riding the setting. Make sure to pass the cors: false param as shown below if using an Apollo Server and associated middleware
  })
  // combine apollo-graphQL with express

  //Cross-Origin Resource Sharing (CORS) is an HTTP-header based mechanism that allows a server to indicate any other origins (domain, scheme, or port) than its own from which a browser should permit loading of resources.

  app.listen(4000, () => {
    console.log('server started on localhost:4000')
  })
}
main().catch((error) => {
  console.error(error)
})

//every time a migrations happen yarn watch make new migration file even if we delete the TS file. so delete dist when you delete a file in TS as watch can't delete it

// sql 1
// const post = orm.em.create(Post, { title: 'my first post' })
// await orm.em.persistAndFlush(post)

// await orm.em.nativeInsert(Post, { title: 'title 2' }) won't work date will be empty

// const posts = await orm.em.find(Post, {}) this is because even though we are using class . the decorator change it to object like graphql syntax.

// console.log(posts)
