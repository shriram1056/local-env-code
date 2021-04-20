import { DeleteIcon, EditIcon } from '@chakra-ui/icons'
import { Box, IconButton } from '@chakra-ui/react'
import NextLink from 'next/link'
import React from 'react'
import { useDeletePostMutation, useMeQuery } from '../generated/graphql'

interface EditDeletePostButtonsProps {
  id: number
  creatorId: number
}

export const EditDeletePostButtons: React.FC<EditDeletePostButtonsProps> = ({
  id,
  creatorId,
}) => {
  const { data: meData } = useMeQuery()

  const [deletePost] = useDeletePostMutation()
  if (meData?.me?.id !== creatorId) {
    return null
  }
  return (
    <Box>
      <IconButton
        ml="auto"
        icon={<DeleteIcon />}
        aria-label="Delete Post"
        mr={4}
        onClick={() => {
          deletePost({
            variables: { id },
            update: (cache) => {
              console.log(cache)
              cache.evict({ id: 'Post:' + id }) // remove the post with id from cache
            },
          })
        }}
      />
      <NextLink href="/post/edit/[id]" as={`/post/edit/${id}`}>
        <IconButton
          icon={<EditIcon />}
          aria-label="Edit Post"
          ml="auto"
          onClick={() => {}}
        />
      </NextLink>
    </Box>
  )
}
