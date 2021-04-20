import { Field, Int, ObjectType } from 'type-graphql'
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Updoot } from './updoot'
import { User } from './Users'
//For simple types (like string or boolean) we dont need to provide return type
//we need to provide return type about generic types (like Array or Promise). So to declare the Rate[] type, we have to use the explicit [ ] syntax for array types - @Field(type => [Rate])
@ObjectType()
@Entity()
export class Post extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id!: number

  @Field()
  @Column()
  title!: string

  @Field()
  @Column()
  text!: string

  @Field()
  @Column({ type: 'int', default: 0 })
  points!: number

  @Field(() => Int, { nullable: true })
  voteStatus: number | null // 1 or -1 or null
  // the voteStatus is for marking red| green color on buttons seen by the user upvotes

  // here we are making the foreign key that overide the one made by typeORM. the rule is propertyName(name of MANY TO ONE ) + referencedColumnName(name of primary column by default)
  @Field()
  @Column()
  creatorId: number

  @Field()
  // one post can only have one creator
  @ManyToOne(() => User, (user) => user.posts)
  creator: User

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(() => Updoot, (updoot) => updoot.post)
  updoots: Updoot[]
}
// decorator is for telling the library what this is
