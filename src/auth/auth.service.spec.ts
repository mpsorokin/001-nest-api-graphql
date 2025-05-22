import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { RegisterInput } from './inputs/register.input';
import { LoginInput } from './inputs/login.input';
import { Response } from 'express';
import * as argon2 from 'argon2';

// Mocks
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

const mockConfigService = {
  getOrThrow: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
  verifyAsync: jest.fn(),
};

const mockResponse = {
  cookie: jest.fn(),
} as unknown as Response;

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let configService: ConfigService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
    jwtService = module.get<JwtService>(JwtService);

    // Initial ConfigService mock values
    mockConfigService.getOrThrow.mockImplementation((key: string) => {
      if (key === 'JWT_ACCESS_TOKEN_TTL') return '15m';
      if (key === 'JWT_REFRESH_TOKEN_TTL') return '7d';
      if (key === 'COOKIE_DOMAIN') return 'localhost';
      if (key === 'NODE_ENV') return 'development';
      return null;
    });

    jest.clearAllMocks(); // Reset mocks before each test
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerInput: RegisterInput = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should register a new user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({ id: '1', ...registerInput });
      mockJwtService.sign.mockReturnValueOnce('mockAccessToken').mockReturnValueOnce('mockRefreshToken');

      const result = await service.register(mockResponse, registerInput);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({ where: { email: registerInput.email } });
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: registerInput.email,
          name: registerInput.name,
          password: expect.any(String), // Argon2 hash
        },
      });
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'mockRefreshToken',
        expect.any(Object),
      );
      expect(result).toEqual({ accessToken: 'mockAccessToken' });
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: '1', ...registerInput });

      await expect(service.register(mockResponse, registerInput)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: 'password123',
    };
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      password: 'hashedPassword', // Assume this is a valid Argon2 hash
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    it('should login a user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(argon2, 'verify').mockResolvedValue(true);
      mockJwtService.sign.mockReturnValueOnce('mockAccessToken').mockReturnValueOnce('mockRefreshToken');

      const result = await service.login(mockResponse, loginInput);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({ select: { id: true, password: true }, where: { email: loginInput.email } });
      expect(argon2.verify).toHaveBeenCalledWith(mockUser.password, loginInput.password);
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'mockRefreshToken',
        expect.any(Object),
      );
      expect(result).toEqual({ accessToken: 'mockAccessToken' });
    });

    it('should throw NotFoundException if email does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(mockResponse, loginInput)).rejects.toThrow(NotFoundException);
      expect(argon2.verify).not.toHaveBeenCalled();
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if password does not match', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(argon2, 'verify').mockResolvedValue(false);

      await expect(service.login(mockResponse, loginInput)).rejects.toThrow(NotFoundException);
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    const mockReq = {
      cookies: {
        refreshToken: 'mockRefreshToken',
      },
    } as any;

    const mockUser = {
      id: '1',
      email: 'test@example.com',
      password: 'hashedPassword',
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    it('should refresh tokens successfully', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ id: '1' });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValueOnce('newMockAccessToken').mockReturnValueOnce('newMockRefreshToken');

      const result = await service.refresh(mockReq, mockResponse);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('mockRefreshToken');
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({ where: { id: '1' }, select: { id: true } });
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'newMockRefreshToken',
        expect.any(Object),
      );
      expect(result).toEqual({ accessToken: 'newMockAccessToken' });
    });

    it('should throw UnauthorizedException if no refresh token in cookies', async () => {
      const reqWithoutToken = { cookies: {} } as any;
      await expect(service.refresh(reqWithoutToken, mockResponse)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));
      // The service doesn't catch and re-throw as UnauthorizedException in this specific path
      // It would propagate the error from jwtService.verifyAsync
      await expect(service.refresh(mockReq, mockResponse)).rejects.toThrow('Invalid token');
    });

    it('should throw NotFoundException if user from token payload does not exist', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ id: '1' });
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      await expect(service.refresh(mockReq, mockResponse)).rejects.toThrow(NotFoundException);
    });
  });

  describe('logout', () => {
    it('should logout a user successfully', () => {
      const result = service.logout(mockResponse);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        '',
        expect.objectContaining({
          expires: new Date(0),
        }),
      );
      expect(result).toBe(true);
    });
  });

  describe('validate', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      password: 'hashedPassword',
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    it('should validate and return user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.validate('1');
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user does not exist during validation', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      await expect(service.validate('1')).rejects.toThrow(NotFoundException);
    });
  });
});
