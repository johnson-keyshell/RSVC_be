import { HttpException, HttpStatus } from '@nestjs/common';

export class CustomException extends HttpException {
  public isSuccess: boolean = false;
  public data: object = null;

  constructor(
    public error: string,
    public statusCode: HttpStatus | number,
  ) {
    super(error, statusCode);
  }
}
