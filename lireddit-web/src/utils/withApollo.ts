import { ApolloClient, InMemoryCache } from '@apollo/client'
import { NextPageContext } from 'next'
import { PaginatedPosts } from '../generated/graphql'
// this import is for forwarding the cookie
import { createWithApollo } from './createWithApollo'

const createClient = (ctx: NextPageContext) =>
  new ApolloClient({
    uri: 'http://localhost:4000/graphql',
    credentials: 'include', //Apollo Client can include user credentials (basic auth, cookies, etc.) in the HTTP requests it makes to a GraphQL server. By default, credentials are included only if the server is hosted at the same origin as the application using Apollo Client.also, set credentials to true in cors package in express
    headers: {
      cookie:
        (typeof window === 'undefined'
          ? ctx?.req?.headers.cookie
          : undefined) || '',
    },
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            posts: {
              keyArgs: [],
              merge(
                existing: PaginatedPosts | undefined,
                incoming: PaginatedPosts
              ): PaginatedPosts {
                return {
                  ...incoming,
                  posts: [...(existing?.posts || []), ...incoming.posts],
                }
              },
            },
          },
        },
      },
    }),
  })

export const withApollo = createWithApollo(createClient)
//keyArgs - []: Specifying this array can help reduce the amount of duplicate data in your cache.

//By default, the cache stores a separate value for every unique combination of argument values you provide when querying a particular field. When you specify a field's key arguments, the cache understands that any non-key arguments don't affect that field's value
// Consequently, if you execute two different queries with the monthForNumber field, passing the same number argument but different accessToken arguments, the second query response will overwrite the first, because both invocations use the exact same value for all key arguments.
