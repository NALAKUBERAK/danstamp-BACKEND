import { CreateUserDto } from '../../user/dto/create-user.dto';

// El registro pide los mismos datos que la creación de usuario:
// se reutilizan las validaciones de CreateUserDto
export class RegisterDto extends CreateUserDto {}