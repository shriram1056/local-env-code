import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from 'type-graphql'
import { getConnection } from 'typeorm'
import { Post } from '../entities/post' // here if you use src/entities/post, there will be a error.because the yarn dev look at js part i.e. dist/entities/post
import { Updoot } from '../entities/updoot'
import { User } from '../entities/Users'
import { isAuth } from '../middleware/isAuth'
import { MyContext } from '../types'

//name of the function after @query is the name of property used for querying

//() => [Post]  this is to say return type is post array
@InputType()
class PostInput {
  @Field()
  title: string
  @Field()
  text: string
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[]
  @Field()
  hasMore: boolean
}

@Resolver(Post) // this is need for textSnippet root: Post
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(@Root() root: Post) {
    return root.text.slice(0, 50)
  }
  // field resolver to get modified field data.@Root to inject the post object.

  @FieldResolver(() => User)
  creator(@Root() post: Post, @Ctx() { userLoader }: MyContext) {
    return userLoader.load(post.creatorId)
    // this runs after we return Post or Post[] with creator field.

    //like  in Array of Posts: Post[1], 2,3,4...n, this resolver gets called for each.so, findOne runs multiple times that is why we use data loader

    /*
    return User.findOne(post.creatorId) 

      this runs every time for everyPost returned from DB. or N+ 1 PROBLEM

      this assign value for creator with the foreign key column creatorId

    or write SQL every time

     json_build_object(
      'id',u.id,
      'username',u.username,
      'email',u.email,
      'createdAt', u."createdAt",
      'updatedAt', u."updatedAt"
    ) creator,

    or EXPLICITLY ASK FOR RELATION
    Post.findOne(id, { relations: ['creator'] })
    */
  }

  @FieldResolver(() => Int, { nullable: true })
  async voteStatus(
    @Root() post: Post,
    @Ctx() { updootLoader, req }: MyContext
  ) {
    if (!req.session.userId) {
      return null
    }

    /*${
      req.session.userId
        ? '(select value from updoot where "userId" = $2 and "postId" = p.id) "voteStatus"'
        : 'null as "voteStatus"'
    }   */
    const updoot = await updootLoader.load({
      postId: post.id,
      userId: req.session.userId,
    })

    return updoot ? updoot.value : null
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg('postid', () => Int) postId: number,
    @Ctx() { req }: MyContext,
    @Arg('value', () => Int) value: number
  ) {
    const { userId } = req.session
    const isUpdoot = value !== -1
    const realValue = isUpdoot ? 1 : -1

    const updoot = await Updoot.findOne({ where: { postId, userId } })

    // the user has voted on the post before
    // and they are changing their vote

    // each user can only vote either -1 or 1.
    //so if user's vote= +1
    // to change vote to -1, we should subtract total vote by -2
    if (updoot && updoot.value !== realValue) {
      await getConnection().transaction(async (tm) => {
        await tm.query(
          `
    update updoot
    set value = $1
    where "postId" = $2 and "userId" = $3
        `,
          [realValue, postId, userId]
        )

        await tm.query(
          `
          update post
          set points = points + $1
          where id = $2
        `,
          [2 * realValue, postId]
        )
      })
    } else if (!updoot) {
      // has never voted before
      await getConnection().transaction(async (tm) => {
        await tm.query(
          `
    insert into updoot ("userId", "postId", value)
    values ($1, $2, $3)
        `,
          [userId, postId, realValue]
        )

        await tm.query(
          `
    update post
    set points = points + $1
    where id = $2
      `,
          [realValue, postId]
        )
      })
    }

    return true
    /*In one transaction you can execute as many sql as needed
      [userId, postId, realValue] - prepared statement can't be used in a transaction
    inserting into same postId,userId is not possible as You cannot have duplicate keys on primary key column*/

    /*    getConnection().query(
      `
      START TRANSACTION;
      insert into updoot ("userId", "postId", value)
    values (${userId}, ${postId}, ${realValue});
  update post
  set points = points + ${realValue}
  where id =${postId};
 COMMIT;`
    )*/
  }

  @Query(() => PaginatedPosts) // what is in the property of graphql
  async posts(
    @Arg('limit', () => Int) limit: number,
    @Arg('cursor', () => String, { nullable: true }) cursor: string | null
  ): Promise<PaginatedPosts> {
    // here MyContext is the type of the of the context - { em: orm.em }. em is the property inside context  objectthat we are accessing
    const realLimit = Math.min(50, limit)
    const reaLimitPlusOne = realLimit + 1
    const replacements: any[] = [reaLimitPlusOne]

    /* if (req.session.userId) {
      replacements.push(req.session.userId)
    ERROR: bind message supplies 2 parameters, but prepared statement "" requires 1. given when there are 2 item in replacement arrya and only one is used in sql
    } */
    let cursorIdx
    if (cursor) {
      replacements.push(new Date(parseInt(cursor)))
      cursorIdx = replacements.length
      // cursor needs to be 1 or 2 depending on userId. so we use length to decide which index it is in as it is the last one
    }

    // the below SQL: select everything from post and creator from sql and get user that have the condition
    //  cursorIdx is the index and not value
    const posts = await getConnection().query(
      `
    select p.*
    from post p
    inner join public.user u on u.id= p."creatorId"
    ${cursor ? `where p."createdAt" < $${cursorIdx}` : ''}   
    order by p."createdAt" DESC
    limit $1
    `,
      replacements
    )
    /*this fetch needless data at times like voteStatus and creator
    
    select p.*,

    
    json_build_object(
      'id',u.id,
      'username',u.username,
      'email',u.email,
      'createdAt', u."createdAt",
      'updatedAt', u."updatedAt"
    ) creator, this is resolved by cretor resolver


    ${
      req.session.userId
        ? '(select value from updoot where "userId" = $2 and "postId" = p.id) "voteStatus"'
        : 'null as "voteStatus"'
    }  this by VoteStaus resolver


    from post p
    inner join public.user u on u.id= p."creatorId"
    ${cursor ? `where p."createdAt" < $${cursorIdx}` : ''}
    order by p."createdAt" DESC
    limit $1*/

    // $1 - first item in array, $2 - second item in array
    // limit-max of number data to take
    // '"createdAt" this is because postgress doesn't respect upper case
    // public.user - schema + table name

    /*   const qb = getConnection()
      .getRepository(Post)
      .createQueryBuilder('p')
      .orderBy('"createdAt"', 'DESC')
      .take(reaLimitPlusOne)

    if (cursor) {
      qb.where('"createdAt" < :cursor', { cursor: new Date(parseInt(cursor)) })
    }
    const posts = await qb.getMany()
    */
    return {
      posts: posts.slice(0, realLimit),
      hasMore: posts.length === reaLimitPlusOne, // true: if items in array === limit + 1
      //false if number of items in array <= limit
    }
    // this is because even though we are using class. the decorator change it to object like { ssr: true } gaphql syntax.
  }

  // by defualt number is infered as float
  @Query(() => Post, { nullable: true })
  post(@Arg('id', () => Int) id: number): Promise<Post | undefined> {
    return Post.findOne(id, { relations: ['creator'] }) // normally, {where: sth}. but for primary key this is short
    // here we are asking the typeORM to make to inner join by using the overrided foreign key column. To load a Post with User
  }

  @Mutation(() => Post)
  @UseMiddleware(isAuth) // check if user is logged in
  async createPost(
    @Arg('input') input: PostInput,
    @Ctx() { req }: MyContext
  ): Promise<Post> {
    //2sql : one to create and save. use query builder
    return Post.create({
      ...input,
      creatorId: req.session.userId,
    }).save()
  }

  @Mutation(() => Post, { nullable: true })
  @UseMiddleware(isAuth)
  async updatePost(
    @Arg('id', () => Int) id: number,
    @Arg('title') title: string,
    @Arg('text') text: string,
    @Ctx() { req }: MyContext
  ): Promise<Post | null> {
    const result = await getConnection()
      .createQueryBuilder()
      .update(Post)
      .set({ title, text })
      .where('id = :id and "creatorId" = :creatorId', {
        id,
        creatorId: req.session.userId,
      })
      .returning('*')
      .execute()

    return result.raw[0]
  }

  // graphQl infer number as float if return type is not specified
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deletePost(
    @Arg('id', () => Int) id: number,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {
    // not cascade way
    /* const post = await Post.findOne(id)
    if (!post) {
      return false
    }
    if (post.creatorId !== req.session.userId) {
      throw new Error('not authorized')
    }

    await Updoot.delete({ postId: id })
    WE HAVE TO DELETE UPDOOT AS IT HAS POSTID AS FOREIGN KEY
    await Post.delete({ id })
    */
    await Post.delete({ id, creatorId: req.session.userId })
    return true
  }
}
