import argon2 from 'argon2'
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
} from 'type-graphql'
import { getConnection } from 'typeorm'
import { v4 } from 'uuid'
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from '../constants'
import { User } from '../entities/Users'
import { MyContext } from '../types'
import { sendEmail } from '../utils/sendEmail'
import { validateRegister } from '../utils/validateRegister'
import { UsernamePasswordInput } from './UsernamePasswordInput'
// in graphql we can't throw errors.
@ObjectType()
class FieldError {
  @Field()
  field: string

  @Field()
  message: string
}
// [objects of Field error] = [FieldError]
@ObjectType()
export class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[]
  // ? marks the member as being optional .this lets use create onbject with fields with ? as optional

  @Field(() => User, { nullable: true })
  user?: User
}
// req.session: it won't exist until you use the express-session middleware, Declaration merging can be used to add your own properties.

// object type are returned in resolver.input type for argument. e.g. see in entities
@Resolver(User)
export class UserResolver {
  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { req }: MyContext) {
    // this is the current user and its ok to show them their own email
    if (req.session.userId === user.id) {
      return user.email
    }
    // current user wants to see someone elses email
    return ''
  }
  // this is returned instead of user's email field in graphql

  @Mutation(() => UserResponse)
  async changePassword(
    @Arg('token') token: string,
    @Arg('newPassword') newPassword: string,
    @Ctx() { redis, req }: MyContext
  ): Promise<UserResponse> {
    if (newPassword.length <= 2) {
      return {
        errors: [
          {
            field: 'newPassword',
            message: 'length must be greater than 2',
          },
        ],
      }
    }

    const key = FORGET_PASSWORD_PREFIX + token

    const userId = await redis.get(key) // this is done in forgot password mutation below
    // this is used for temporarily storing user.id to change password is not the cookie in redis
    if (!userId) {
      return {
        errors: [
          {
            field: 'token',
            message: 'token expired',
          },
        ],
      }
    }
    const userIdNum = parseInt(userId)
    const user = await User.findOne(userIdNum)

    if (!user) {
      return {
        errors: [
          {
            field: 'token',
            message: 'user no longer exists',
          },
        ],
      }
    }

    user.password = await argon2.hash(newPassword)
    await User.update(
      { id: userIdNum },
      {
        password: await argon2.hash(newPassword),
      }
    )

    await redis.del(key) // this is for using this token only once or only one password reset with a token

    req.session.userId = user.id

    return { user }
  }

  // to get email for forgot password
  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg('email') email: string,
    @Ctx() { redis }: MyContext
  ) {
    const user = await User.findOne({ where: { email } })
    if (!user) {
      return true
    }
    const token = v4() // for identifying password change
    await redis.set(
      FORGET_PASSWORD_PREFIX + token,
      user.id,
      'ex', // expire after some time
      1000 * 60 * 60 * 24 * 3
    ) // this is used for temporarily storing user.id to change password is not the cookie in redis
    //key,value,mode,time
    await sendEmail(
      email,
      `<a href="http://localhost:3000/change-password/${token}">resetpassword</a>`
    )
    return true
  }

  @Query(() => User, { nullable: true })
  me(@Ctx() { req }: MyContext) {
    if (!req.session.userId) {
      // this is fetched accurately because browser sends a cookie with a secret key to the server at every request and the cookie details come from redis using this secret key. and cookie are unique
      return null
    }

    return User.findOne(req.session.userId)
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx()
    { req }: MyContext
  ): Promise<UserResponse> {
    console.log('options:', options)
    const errors = validateRegister(options)
    if (errors) {
      return { errors: errors }
    }
    const hashedPassword = await argon2.hash(options.password)
    let user
    try {
      const result = await getConnection()
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({
          username: options.username,
          email: options.email,
          password: hashedPassword,
        })
        .returning('*')
        .execute()
      user = result.raw[0]
    } catch (err) {
      if (err.code === '23505') {
        return {
          errors: [
            {
              field: 'username',
              message: 'username already taken',
            },
          ],
        }
      }

      console.log('message, ', err.message)
    }
    req.session.userId = user.id

    return {
      user,
    }
    // if we didn't catch the insertion failure then we will get the user's id as null
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('usernameOrEmail') usernameOrEmail: string,
    @Arg('password') password: string,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const user = await User.findOne(
      usernameOrEmail.includes('@')
        ? { where: { email: usernameOrEmail } }
        : { where: { username: usernameOrEmail } }
    )
    if (!user) {
      console.log('hi')
      return {
        errors: [
          {
            field: 'usernameOrEmail',
            message: "that username doesn't exist",
          },
        ],
      }
    }
    const valid = await argon2.verify(user.password, password)
    if (!valid) {
      return {
        errors: [
          {
            field: 'password',
            message: 'incorrect password',
          },
        ],
      }
    }

    req.session.userId = user.id
    // store user id on session
    //kepp them logged in

    return {
      user,
    }
  }
  //  register(options:{username:"shriram",password:"shriram"}) in graphql

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext) {
    return new Promise((resolve) =>
      req.session.destroy((err) => {
        res.clearCookie(COOKIE_NAME) // this is used to clear in the cookie in browser
        if (err) {
          console.log(err)
          resolve(false)
          return
        }

        resolve(true)
      })
    )
  }
  //Once complete, the callback will be invoked.
}
