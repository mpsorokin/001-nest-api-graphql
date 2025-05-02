import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  private users = [
    { id: 1, username: 'test1', email: 'test1@mail.com' },
    { id: 2, username: 'test2', email: 'test2@mail.com' },
    { id: 2, username: 'test3', email: 'test3@mail.com' },
  ];

  findAll() {
    return this.users;
  }
}
