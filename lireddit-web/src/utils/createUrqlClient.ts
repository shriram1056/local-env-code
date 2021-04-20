import { Cache, cacheExchange, Resolver } from '@urql/exchange-graphcache'
import gql from 'graphql-tag'
import Router from 'next/router'
import {
  dedupExchange,
  Exchange,
  fetchExchange,
  stringifyVariables,
} from 'urql'
import { pipe, tap } from 'wonka'
import {
  DeletePostMutationVariables,
  LoginMutation,
  LogoutMutation,
  MeDocument,
  MeQuery,
  RegisterMutation,
  VoteMutationVariables,
} from '../generated/graphql'
import { betterUpdateQuery } from './betterUpdateQuery'
import { isServer } from './isServer'

// this is a global handler for errors
const errorExchange: Exchange = ({ forward }) => (ops$) => {
  return pipe(
    forward(ops$),
    tap(({ error }) => {
      if (error?.message.includes('not authenticated')) {
        Router.replace('/login') // this replace the current route
      }
    })
  )
}

export const cursorPagination = (): Resolver => {
  return (_parent, fieldArgs, cache, info) => {
    const { parentKey: entityKey, fieldName } = info
    // entity key - Query, fieldName is posts. info- info about the query in resolver

    const allFields = cache.inspectFields(entityKey) //all the queires that run and are cached

    const fieldInfos = allFields.filter((info) => info.fieldName === fieldName) // we are finding the query cache that matches with the query in resolver

    const size = fieldInfos.length
    if (size === 0) {
      return undefined
    }

    const fieldKey = `${fieldName}(${stringifyVariables(fieldArgs)})`
    // stringifyVariables- change the args to json like stuff

    const isItInTheCache = cache.resolve(entityKey, fieldKey)
    // console.log(isItInTheCache)
    info.partial = !isItInTheCache
    //here if there is nothing in cache then do call the query with new paramater
    //partial: to indicate that some data is uncached and missing.

    let hasMore = true
    const results: string[] = []
    fieldInfos.forEach((fi) => {
      const key = cache.resolve(entityKey, fi.fieldKey) as string // to get all queries from cache
      const _hasMore = cache.resolve(key, 'hasMore')
      const data = cache.resolve(key, 'posts') as string[]
      if (!_hasMore) {
        hasMore = _hasMore as boolean
      }
      results.push(...data) //this destructure the string array
    })

    return {
      __typename: 'PaginatedPosts', // type returned
      hasMore,
      posts: results,
    }
    // this pagination stores each load more in array
  }
}

function invalidateAllPosts(cache: Cache) {
  const allFields = cache.inspectFields('Query')
  const fieldInfos = allFields.filter((info) => info.fieldName === 'posts')
  fieldInfos.forEach((fi) => {
    cache.invalidate('Query', 'posts', fi.arguments || {})
  })
}

export const createUrqlClient = (ssrExchange: any, ctx: any) => {
  let cookie = ''
  if (isServer()) {
    cookie = ctx?.req?.headers?.cookie
    // this is only available in next js server
  }

  return {
    url: 'http://localhost:4000/graphql',
    fetchOptions: {
      credentials: 'include' as const, // this is needed for server to send the cookie along with every request. you also need to add this in graphQL settings
      //this will throw Cross-Origin Resource Sharing. if we didn't set the cors in server-side

      headers: cookie
        ? {
            cookie,
            // send the cookie to graphQl api if server side render
          }
        : undefined,
    },
    exchanges: [
      dedupExchange,
      cacheExchange({
        keys: {
          PaginatedPosts: () => null,
          // ERROR:You have to request `id` or `_id` fields for all selection sets or create a custom `keys` config for `PaginatedPosts`.
          // Entities without keys will be embedded directly on the parent entity.
          //If this is intentional, create a `keys` config for `PaginatedPosts` that always returns null.
        },
        resolvers: {
          // this runs every time the query is run.
          Query: {
            posts: cursorPagination(),
          },
        },
        updates: {
          Mutation: {
            deletePost: (_result, args, cache, info) => {
              cache.invalidate({
                __typename: 'Post',
                id: (args as DeletePostMutationVariables).id,
              })
            },
            vote: (_result, args, cache, info) => {
              // we are updating points in post in ui
              const { postid, value } = args as VoteMutationVariables
              const data = cache.readFragment(
                gql`
                  fragment _ on Post {
                    id
                    points
                    voteStatus
                  }
                `,
                { id: postid } as any
              )

              if (data) {
                // don't update the cache if if the same button isclicked
                if (data.voteStatus === value) {
                  console.log('def')
                  return
                }
                const newPoints =
                  (data.points as number) + (!data.voteStatus ? 1 : 2) * value // the default of vote status is null if null use 1 else 2
                cache.writeFragment(
                  gql`
                    fragment __ on Post {
                      points
                      voteStatus
                    }
                  `,
                  { id: postid, points: newPoints, voteStatus: value } as any
                )
              }
            },
            createPost: (_result, args, cache, info) => {
              // ALTERNATIVE FOR CACHE EXCHANGE BELOW
              const allFields = cache.inspectFields('Query')
              const fieldInfos = allFields.filter(
                (info) => info.fieldName === 'posts'
              )
              fieldInfos.forEach((fi) => {
                cache.invalidate('Query', 'posts', fi.arguments || {})
              })
              // we are invalidating all the posts in cache as if you have clicked load more 3 times then created a post, you will be redirected to the cached pafge and not the reloaded page. so old post show up at top and updated post at the bottom
            },
            login: (_result, args, cache, info) => {
              // result is the complete data of login mutation. this is used in replacement of Query me's data
              betterUpdateQuery<LoginMutation, MeQuery>(
                cache,
                { query: MeDocument }, // the query to be updated
                _result,
                (result, query) => {
                  // we are just defining the function here
                  //in the parameter we pass the LoginMuation and MeQuery object's type as argument
                  if (result.login.errors) {
                    return query
                  } else {
                    return {
                      me: result.login.user,
                    }
                  }
                }
              )
              invalidateAllPosts(cache)
            },
            logout: (_result, args, cache, info) => {
              // result is the complete data of login mutation. this is used in replacement of Query me's data
              betterUpdateQuery<LogoutMutation, MeQuery>(
                cache,
                { query: MeDocument }, // the query to be updated
                _result,
                () => {
                  return {
                    me: null,
                  }
                }
              )
            },
            register: (_result, args, cache, info) => {
              betterUpdateQuery<RegisterMutation, MeQuery>(
                cache,
                { query: MeDocument }, // the query to be updated
                _result,
                (result, query) => {
                  if (result.register.errors) {
                    return query // if not register then return the current me query
                  } else {
                    return {
                      me: result.register.user, // user and errors are in mutation check it.
                      // the user field in mutation is the same as me query
                    }
                  }
                }
              )
            },
          },
        },
      }),
      errorExchange,
      ssrExchange, // server side render
      fetchExchange,
    ],
  }
}

///point to out graphQL server
//credentials: Apollo Client can include user credentials (basic auth, cookies, etc.) in the HTTP requests it makes to a GraphQL server.

//'same-origin' as shown below, if your backend server is the same domain or else credentials: 'include' if your backend is a different domain

//resolvers
// A nested mapping of resolvers, which are used to override the record or entity that Graphcache resolves for a given field for a type.

// updates
// A nested mapping of updater functions for mutation and subscription fields, which may be used to add side-effects that update other parts of the cache when the given subscription or mutation field is written to the cache.
