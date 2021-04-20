import { BaseEntity, Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm'
import { Post } from './post'
import { User } from './Users'

// m to n
// many to many
// user <-> posts
// user -> join table <- posts
// user -> updoot <- posts

@Entity()
export class Updoot extends BaseEntity {
  @Column({ type: 'int' })
  value: number

  @PrimaryColumn()
  userId: number
  //@PrimaryColumn() creates a primary column which takes any value of any type. You can specify the column type.they are not null

  //@PrimaryGeneratedColumn() creates a primary column which value will be automatically generated with an auto-increment value. not null

  @ManyToOne(() => User, (user) => user.updoots)
  user: User

  @PrimaryColumn()
  postId: number
  // You cannot have duplicate keys on primary key column.
  // this column refers to post foreign key. we are overidding or exposing the foreign key column created by typeORM. the naming rule is name of Many to One column + primary key column of the related entity

  @ManyToOne(() => Post, (post) => post.updoots, {
    onDelete: 'CASCADE',
  })
  post: Post
  // onDelete delete the updoots if a post with ID= postId is deleted.
}
