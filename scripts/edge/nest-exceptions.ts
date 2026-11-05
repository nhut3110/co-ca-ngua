class HttpException extends Error {
  constructor(
    message: string,
    private status: number,
  ) {
    super(message);
  }
  getStatus() {
    return this.status;
  }
}
export class BadRequestException extends HttpException {
  constructor(message = 'Bad Request') {
    super(message, 400);
  }
}
export class UnauthorizedException extends HttpException {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}
export class ForbiddenException extends HttpException {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}
export class NotFoundException extends HttpException {
  constructor(message = 'Not Found') {
    super(message, 404);
  }
}
export class ConflictException extends HttpException {
  constructor(message = 'Conflict') {
    super(message, 409);
  }
}
