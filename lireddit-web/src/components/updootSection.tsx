import { ApolloCache } from '@apollo/client'
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import { Flex, IconButton } from '@chakra-ui/react'
import gql from 'graphql-tag'
import React, { useState } from 'react'
import { PostsQuery, useVoteMutation, VoteMutation } from '../generated/graphql'

interface UpdootSectionProps {
  post: PostsQuery['posts']['posts'][0]
}
// this props is passed in index
const updateAfterVote = (
  value: number,
  postId: number,
  cache: ApolloCache<VoteMutation>
) => {
  const data = cache.readFragment<{
    id: number
    points: number
    voteStatus: number | null
  }>({
    id: 'Post:' + postId,
    fragment: gql`
      fragment _ on Post {
        id
        points
        voteStatus
      }
    `,
  })

  if (data) {
    if (data.voteStatus === value) {
      return
    }
    const newPoints =
      (data.points as number) + (!data.voteStatus ? 1 : 2) * value
    cache.writeFragment({
      id: 'Post:' + postId,
      fragment: gql`
        fragment __ on Post {
          points
          voteStatus
        }
      `,
      data: { points: newPoints, voteStatus: value },
    })
  }
}
export const UpdootSection: React.FC<UpdootSectionProps> = ({ post }) => {
  const [loadingState, setLoadingState] = useState<
    'updoot-loading' | 'downdoot-loading' | 'not-loading'
  >('not-loading') // there are 3 types in this
  const [vote] = useVoteMutation()
  return (
    <Flex direction="column" justifyContent="center" alignItems="center" mr={4}>
      <IconButton
        onClick={async () => {
          if (post.voteStatus === 1) {
            return
          }
          setLoadingState('updoot-loading')
          await vote({
            variables: {
              postid: post.id,
              value: 1,
            },
            update: (cache) => updateAfterVote(1, post.id, cache),
          })
          setLoadingState('not-loading')
        }}
        colorScheme={post.voteStatus === 1 ? 'green' : undefined}
        isLoading={loadingState === 'updoot-loading'} // loading state made by user
        aria-label="updoot post"
        icon={<ChevronUpIcon />}
      />
      {post.points}
      <IconButton
        onClick={async () => {
          if (post.voteStatus === -1) {
            return
          }
          setLoadingState('downdoot-loading')
          await vote({
            variables: {
              postid: post.id,
              value: -1,
            },
            update: (cache) => updateAfterVote(-1, post.id, cache),
          })
          setLoadingState('not-loading')
        }}
        colorScheme={post.voteStatus === -1 ? 'red' : undefined}
        isLoading={loadingState === 'downdoot-loading'}
        aria-label="downdoot post"
        icon={<ChevronDownIcon />}
      />
    </Flex>
  )
}
