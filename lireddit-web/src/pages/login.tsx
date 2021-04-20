import { Box, Button, Flex, Link } from '@chakra-ui/react'
import { Form, Formik } from 'formik'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import React from 'react'
import { InputField } from '../components/inputField'
import { Wrapper } from '../components/Wrapper'
import { MeDocument, MeQuery, useLoginMutation } from '../generated/graphql'
import { toErrorMap } from '../utils/toErrorMap'
import { withApollo } from '../utils/withApollo'
const Login: React.FC<{}> = ({}) => {
  const router = useRouter()
  const [login] = useLoginMutation()
  //To run a mutation, you first call useMutation within a React component and pass it a GraphQL string that represents the mutation.
  //1:An object with fields that represent the current status of the mutation's execution.{fetching, error, and data}
  // 2: A mutate function that you can call at any time to execute the mutation

  return (
    <Wrapper variant="small">
      <Formik
        initialValues={{ usernameOrEmail: '', password: '' }}
        onSubmit={async (values, { setErrors }) => {
          const response = await login({
            variables: values,
            update: (cache, { data }) => {
              cache.writeQuery<MeQuery>({
                query: MeDocument,
                data: {
                  __typename: 'Query',
                  me: data?.login.user,
                },
              })
              cache.evict({ fieldName: 'posts:{}' })
              //// to remove the upvotes by user
            },
          }) // this return a promise needed to stop the spinner or isSubmitting

          if (response.data?.login.errors) {
            console.log(toErrorMap(response.data.login.errors))
            setErrors(toErrorMap(response.data.login.errors))
          } else if (response.data?.login.user) {
            if (typeof router.query.next === 'string') {
              router.push(router.query.next) // get the query in the url if next is there
            } else {
              router.push('/')
            }
          }
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <InputField
              name="usernameOrEmail"
              placeholder="username or Email"
              label="username or Email"
            />
            <Box mt={4}>
              <InputField
                name="password"
                placeholder="password"
                label="password"
                type="password"
              />
            </Box>
            <Flex mt={2}>
              <NextLink href="/forgot-password">
                <Link ml="auto">forgot password?</Link>
              </NextLink>
            </Flex>
            <Button
              mt={4}
              type="submit"
              colorScheme="teal"
              isLoading={isSubmitting}
            >
              login
            </Button>
          </Form>
        )}
      </Formik>
    </Wrapper>
  )
}

export default withApollo({ ssr: false })(Login)
