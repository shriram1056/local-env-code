import { FieldError } from '../generated/graphql'

export const toErrorMap = (errors: FieldError[]) => {
  const errorMap: Record<string, string> = {}
  errors.forEach(({ field, message }) => {
    errorMap[field] = message
  })

  return errorMap
}
// the FieldError is a array so we convert it to object here

//A Record<K, T> is an object type whose property keys are K and whose property values are T.
