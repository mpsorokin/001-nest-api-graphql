import { Resolver, Query } from '@nestjs/graphql';
import { UserService } from './user.service';
import { UserModel } from './models/user.model';

@Resolver()
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => [UserModel])
  getUsers() {
    return this.userService.findAll();
  }
}
