import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { User, UserRole } from '../../../generated/prisma';

registerEnumType(UserRole, {
  name: 'UserRole',
});

@ObjectType({
  description: 'User Model',
})
export class UserModel implements User {
  @Field(() => ID)
  id: string;

  @Field(() => String, {
    description: 'User Name',
  })
  name: string;

  @Field(() => String, {
    description: 'User Email',
  })
  email: string;

  @Field(() => String, {
    description: 'User Password',
  })
  password: string;

  @Field(() => UserRole, {
    description: 'User Role',
  })
  role: UserRole;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
