import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

describe('CreateUserDto password policy', () => {
  it('accepts a strong password', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'person@example.com',
      password: 'StrongPass9!',
    });
    const errors = await validate(dto);
    expect(errors.find((error) => error.property === 'password')).toBeUndefined();
  });

  it('rejects a password without mixed character classes', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'person@example.com',
      password: 'password',
    });
    const errors = await validate(dto);
    expect(errors.find((error) => error.property === 'password')).toBeDefined();
  });
});
