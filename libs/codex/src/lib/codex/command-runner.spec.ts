import { CodexCommandRunnerError } from './runner-error';
describe('CodexCommandRunnerError', () => { it('keeps an explicit operational code', () => expect(new CodexCommandRunnerError('cancelled', 'cancelled').code).toBe('cancelled')); });
