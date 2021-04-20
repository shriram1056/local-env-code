import { Box, Button, Flex, Heading, Link, Stack, Text } from '@chakra-ui/react'
import NextLink from 'next/link'
import React from 'react'
import { EditDeletePostButtons } from '../components/EditDeletePostButtons'
import { Layout } from '../components/Layout'
import { UpdootSection } from '../components/updootSection'
import { usePostsQuery } from '../generated/graphql'
import { withApollo } from '../utils/withApollo'

const Index = () => {
  const { data, loading, fetchMore, variables } = usePostsQuery({
    variables: {
      limit: 15,
      cursor: null as null | string,
    },
    notifyOnNetworkStatusChange: true, //Enabling this option will also ensure that the value of loading updates when we fetch more.
  })
  // variables is a in=build query method
  if (!loading && !data) {
    return <div> you got query failed for some reason</div>
  }
  return (
    <Layout>
      {!data && loading ? (
        <div>loading</div>
      ) : (
        <Stack spacing={8}>
          {data!.posts.posts.map((p) =>
            // IMPORTANT: CAN'T READ PROPERTY 'ID' OF NULL if the ternary is removed. p.id,if p is null we do null.id
            !p ? null : (
              <Flex key={p.id} p={5} shadow="md" borderWidth="1px">
                <UpdootSection post={p} />

                <Box flex={1}>
                  <NextLink href="/post/[id]" as={`/post/${p.id}`}>
                    {/* href="url in next js server" as="real url" */}
                    <Link>
                      <Heading fontSize="xl">{p.title}</Heading>
                    </Link>
                  </NextLink>
                  <Text>posted by {p.creator.username}</Text>
                  <Flex>
                    <Text flex={1} mt={4}>
                      {p.textSnippet}
                    </Text>
                    <Box ml="auto">
                      <EditDeletePostButtons
                        id={p.id}
                        creatorId={p.creator.id}
                      />
                    </Box>
                  </Flex>
                </Box>
              </Flex>
            )
          )}
        </Stack>
      )}
      {data && data.posts.hasMore ? (
        <Flex>
          <Button
            onClick={() => {
              fetchMore({
                variables: {
                  limit: variables?.limit,
                  cursor:
                    data.posts.posts[data.posts.posts.length - 1].createdAt,
                },
              })
            }}
            isLoading={loading}
            m="auto"
            my={8}
          >
            load more
          </Button>
        </Flex>
      ) : null}
    </Layout>
  )
}
export default withApollo({ ssr: true })(Index)
