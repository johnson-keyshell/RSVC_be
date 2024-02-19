export class HttpResponse {
  constructor(
    public isSuccess: boolean,
    public statusCode: number,
    public data: any,
    public error: string,
  ) {}
}
