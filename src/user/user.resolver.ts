import { Resolver, Query } from '@nestjs/graphql';
import { UserService } from './user.service';
import { UserModel } from './models/user.model';
import { Authorization } from '../auth/decorators/authorization.decorator';
import { Authorized } from '../auth/guards/authorized.guard';
import { User } from '../../generated/prisma';

@Resolver()
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Authorization()
  @Query(() => UserModel)
  getMe(@Authorized() user: User) {
    return user;
  }

  @Query(() => [UserModel])
  getUsers() {
    return this.userService.findAll();
  }
}
