import { Request, Response, NextFunction } from 'express';
import { loggingMiddleware } from '../../src/middleware/logging.middleware';

describe('Logging Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let mockOn: jest.Mock;

  beforeEach(() => {
    mockOn = jest.fn();
    req = {
      method: 'GET',
      path: '/api/news',
    };
    res = {
      statusCode: 200,
      on: mockOn,
    } as any;
    next = jest.fn();
  });

  it('should call next()', () => {
    loggingMiddleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('should register a "finish" event listener', () => {
    loggingMiddleware(req as Request, res as Response, next);
    expect(mockOn).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('should log the finish event with correct info', () => {
    loggingMiddleware(req as Request, res as Response, next);

    // Get the finish callback
    const finishCallback = mockOn.mock.calls.find(
      (call: any[]) => call[0] === 'finish'
    )[1];

    // Simulate finish
    finishCallback();

    expect(console.log).toHaveBeenCalled();
  });
});
