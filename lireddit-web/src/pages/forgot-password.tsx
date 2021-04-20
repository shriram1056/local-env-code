import { Box, Button } from '@chakra-ui/react'
import { Form, Formik } from 'formik'
import React, { useState } from 'react'
import { InputField } from '../components/inputField'
import { Wrapper } from '../components/Wrapper'
import { useForgotPasswordMutation } from '../generated/graphql'
import { withApollo } from '../utils/withApollo'

export const ForgotPassword: React.FC<{}> = ({}) => {
  const [forgotPassword] = useForgotPasswordMutation()
  const [complete, setComplete] = useState(false)
  return (
    <Wrapper variant="small">
      <Formik
        initialValues={{ email: '' }}
        onSubmit={async (values, { setErrors }) => {
          await forgotPassword({ variables: values })
          setComplete(true)
        }}
      >
        {({ isSubmitting }) =>
          complete ? (
            <Box>if an account exists, we sent you an email</Box>
          ) : (
            <Form>
              <InputField
                name="email"
                placeholder="email"
                label="Email"
                type="email"
              />

              <Button
                mt={4}
                type="submit"
                colorScheme="teal"
                isLoading={isSubmitting}
              >
                forgot password
              </Button>
            </Form>
          )
        }
      </Formik>
    </Wrapper>
  )
}
export default withApollo({ ssr: false })(ForgotPassword) // if server responded with 404 then it is due to the above line not being there
