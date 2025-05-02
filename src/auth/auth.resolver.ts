import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { GQLContext } from '../common/interfaces/gql-context.interface';
import { AuthModel } from './models/auth.model';
import { RegisterInput } from './inputs/register.input';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthModel)
  async register(
    @Context() { res }: GQLContext,
    @Args('data') input: RegisterInput,
  ) {
    return this.authService.register(res, input);
  }
}
