import { Box, Heading } from '@chakra-ui/react'
import React from 'react'
import { EditDeletePostButtons } from '../../components/EditDeletePostButtons'
import { Layout } from '../../components/Layout'
import { useGetPostFromUrl } from '../../utils/useGetPostFromUrl'
import { withApollo } from '../../utils/withApollo'

const Post = ({}) => {
  const { data, error, loading } = useGetPostFromUrl()
  if (loading) {
    return (
      <Layout>
        <div>loading...</div>
      </Layout>
    )
  }
  if (!data?.post) {
    return (
      <Layout>
        <Box>could not find post</Box>
      </Layout>
    )
  }
  return (
    <Layout>
      <Heading>{data.post.title}</Heading>
      {data.post.text}
      <EditDeletePostButtons
        id={data.post.id}
        creatorId={data.post.creator.id}
      />
      {/* ?. : this used to check if objects is null or undefined */}
    </Layout>
  )
}
// let x = foo?.bar.baz();
// this code will check if foo is defined otherwise it will return undefined

// old way :

// if(foo != null && foo != undefined) {
//    x = foo.bar.baz();
// }

export default withApollo({ ssr: false })(Post)
