import { UsernamePasswordInput } from '../resolvers/UsernamePasswordInput'

export const validateRegister = (options: UsernamePasswordInput) => {
  if (options.username.length <= 2) {
    return [{ field: 'username', message: 'username is too short' }]
  }
  if (!options.email.includes('@')) {
    return [{ field: 'email', message: 'invalid email' }]
  }
  if (options.username.includes('@')) {
    return [{ field: 'username', message: 'cannot include @ sign' }]
  }

  if (options.password.length <= 3) {
    return [{ field: 'password', message: 'password is too short' }]
  }
  return null
}
