import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto/auth.dto';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}
  async signup(dto: AuthDto) {
    try {
      //hash password
      const hash = await argon.hash(dto.password);
      //create new user
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          hash: hash,
        },
      });
      delete user.hash;
      return user;
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          throw new ForbiddenException('Email user already exists');
        }
      }
      return err;
    }
  }

  async signin(dto: AuthDto) {
    //find user by unique email
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    //check if user exists
    if (!user) {
      throw new ForbiddenException('Email user does not exists');
    }

    //compare password
    const valid = await argon.verify(user.hash, dto.password);
    if (!valid) {
      throw new ForbiddenException('Invalid password');
    }

    delete user.hash;
    return user;
  }
}
