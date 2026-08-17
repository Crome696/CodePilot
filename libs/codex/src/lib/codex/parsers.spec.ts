import { parseCodexEvent, parseCodexOutput } from './parsers';
describe('Codex parsers', () => {
  it('preserves unknown future events', () => expect(parseCodexEvent({ type: 'future.event', value: 1 })).toMatchObject({ type: 'unknown', eventType: 'future.event' }));
  it('keeps assistant, reasoning, tool and result events distinguishable', () => { const output = ['assistant.message', 'reasoning.summary', 'tool.call', 'result'].map((type) => JSON.stringify({ type, text: type })).join('\n'); const parsed = parseCodexOutput(output, 'jsonl', 'execute'); expect(parsed).toMatchObject({ ok: true, data: { events: [{ type: 'assistant' }, { type: 'reasoning' }, { type: 'tool' }, { type: 'result' }] } }); });
  it('rejects malformed JSONL', () => expect(parseCodexOutput('{bad', 'jsonl', 'execute')).toMatchObject({ ok: false, error: { category: 'parse' } }));
});
