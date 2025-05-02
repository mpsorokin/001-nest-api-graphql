import { Context, Query, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { GQLContext } from '../common/interfaces/gql-context.interface';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Query(() => String)
  test(@Context() context: GQLContext) {
    console.log(context.req);

    return 'test';
  }
}
