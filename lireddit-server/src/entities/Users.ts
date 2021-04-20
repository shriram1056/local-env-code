import { Field, ObjectType } from 'type-graphql'
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Post } from './post'
import { Updoot } from './updoot'
//For simple types (like string or boolean) , return type is infered from property's given type
//we need to provide return type about generic types (like Array or Promise). So to declare the Rate[] type, we have to use the explicit [ ] syntax for array types - @Field(type => [Rate])

//type-graphql: by default everything is not null

//Typeorm infers the type from typescript type.so to have a specific type use options and by default everything is non null

//  don't name this table user there is already another user in postgres database

@ObjectType()
@Entity()
export class User extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id!: number

  //normally think of this as something we have defiend and has no effect on the code or bugs.

  @Field()
  @Column({ unique: true })
  username!: string

  @Field()
  @Column({ unique: true })
  email!: string

  @Column()
  password!: string

  // one user can have many post
  @OneToMany(() => Post, (post) => post.creator)
  posts: Post[]

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(() => Updoot, (updoot) => updoot.user)
  updoots: Updoot[]
}
// dexorator is for telling the library what this is
