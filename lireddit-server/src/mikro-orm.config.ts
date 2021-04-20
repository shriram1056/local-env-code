import { MikroORM } from '@mikro-orm/core'
import path from 'path' // this and __dirname from node js. dirname gives current directory
import { __prod__ } from './constants'
import { Post } from './entities/post'
import { User } from './entities/Users'

export default {
  migrations: {
    path: path.join(__dirname, './migrations'),
    pattern: /^[\w-]+\d+\.[tj]s$/, // this is regex
  },
  username: 'postgres',
  password: 'postgres',
  entities: [Post, User],
  dbName: 'lireddit',
  type: 'postgresql',
  debug: !__prod__,
} as Parameters<typeof MikroORM.init>[0] // Parameter<> gives the type of parameter of the given type. the [0] is gives the type of first parameter
