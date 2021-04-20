'use strict'
import nodemailer from 'nodemailer'

export async function sendEmail(to: string, html: string) {
  // let testAccount = await nodemailer.createTestAccount() //dummy email. we console log this and get the user and pass and hradcode them. this only work for short time
  // console.log('test account', testAccount)

  // send mail to dummy email
  let transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'z27lkcldig42nzal@ethereal.email', // generated dummy user
      pass: 'S3f6hMFBGd4uzypRGS', // generated dummy password
    },
  })
  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: '"Fred Foo 👻" <foo@example.com>', // sender address
    to: to, // list of receivers
    subject: 'change password', // Subject line
    html, // we are having html instead of plain text because the text cant have a link to forgot password
  })

  console.log('Message sent: %s', info.messageId)

  console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info))
}
