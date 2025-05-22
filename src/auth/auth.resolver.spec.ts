import { Test, TestingModule } from '@nestjs/testing';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { GQLContext } from '../common/interfaces/gql-context.interface';
import { RegisterInput } from './inputs/register.input';
import { LoginInput } from './inputs/login.input';
import { Response, Request } from 'express';

// Mock AuthService
const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
};

// Mock GQLContext
const mockGqlContext = {
  req: {} as Request,
  res: {
    cookie: jest.fn(), // Mock the cookie function
  } as unknown as Response,
};

describe('AuthResolver', () => {
  let resolver: AuthResolver;
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthResolver,
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    resolver = module.get<AuthResolver>(AuthResolver);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register and return its result', async () => {
      const registerInput: RegisterInput = { email: 'test@example.com', password: 'password', name: 'Test User' };
      const expectedResult = { accessToken: 'mockAccessToken' };
      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await resolver.register(mockGqlContext, registerInput);

      expect(mockAuthService.register).toHaveBeenCalledWith(mockGqlContext.res, registerInput);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('login', () => {
    it('should call authService.login and return its result', async () => {
      const loginInput: LoginInput = { email: 'test@example.com', password: 'password' };
      const expectedResult = { accessToken: 'mockAccessToken' };
      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await resolver.login(mockGqlContext, loginInput);

      expect(mockAuthService.login).toHaveBeenCalledWith(mockGqlContext.res, loginInput);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('refresh', () => {
    it('should call authService.refresh and return its result', async () => {
      const expectedResult = { accessToken: 'newMockAccessToken' };
      mockAuthService.refresh.mockResolvedValue(expectedResult);

      const result = await resolver.refresh(mockGqlContext);

      expect(mockAuthService.refresh).toHaveBeenCalledWith(mockGqlContext.req, mockGqlContext.res);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('logout', () => {
    it('should call authService.logout and return its result', async () => {
      const expectedResult = true;
      mockAuthService.logout.mockResolvedValue(expectedResult);

      const result = await resolver.logout(mockGqlContext);

      expect(mockAuthService.logout).toHaveBeenCalledWith(mockGqlContext.res);
      expect(result).toEqual(expectedResult);
    });
  });
});
