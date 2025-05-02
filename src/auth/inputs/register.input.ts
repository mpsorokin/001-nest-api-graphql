import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RegisterInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(128)
  password: string;
}
