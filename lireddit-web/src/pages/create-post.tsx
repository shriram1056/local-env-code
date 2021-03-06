import { Box, Button } from '@chakra-ui/react'
import { Form, Formik } from 'formik'
import { useRouter } from 'next/router'
import React from 'react'
import { InputField } from '../components/inputField'
import { Layout } from '../components/Layout'
import { useCreatePostMutation } from '../generated/graphql'
import { useIsAuth } from '../utils/useIsAuth'
import { withApollo } from '../utils/withApollo'
const CreatePost: React.FC<{}> = ({}) => {
  const router = useRouter()
  useIsAuth()
  const [createPost] = useCreatePostMutation()
  return (
    <Layout variant="small">
      <Formik
        initialValues={{ title: '', text: '' }}
        onSubmit={async (values, { setErrors }) => {
          const { errors } = await createPost({
            variables: { input: values },
            update: (cache) => {
              cache.evict({ fieldName: 'posts:{}' })
            },
          })
          // direct destructoring of response
          if (!errors) {
            router.push('/')
          }
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <InputField name="title" placeholder="title" label="Title" />
            <Box mt={4}>
              <InputField
                textarea
                name="text"
                placeholder="text..."
                label="Body"
              />
            </Box>
            <Button
              mt={4}
              type="submit"
              colorScheme="teal"
              isLoading={isSubmitting}
            >
              createPost
            </Button>
          </Form>
        )}
      </Formik>
    </Layout>
  )
}
export default withApollo({ ssr: false })(CreatePost)
