/* eslint-env jest */
// Release builds must never send a DeepSeek key from the bundle: they go
// through the ai-proxy Edge Function, which holds the key server-side.

const SUPABASE_URL = 'https://example.supabase.co';
const PROXY_URL = `${SUPABASE_URL}/functions/v1/ai-proxy`;

function loadClient({ dev, config, session = null }) {
  global.__DEV__ = dev;
  let client;
  jest.isolateModules(() => {
    jest.doMock('../../config', () => ({
      API_PROXY_TOKEN: '',
      API_PROXY_URL: '',
      DEEPSEEK_API_KEY: '',
      SUPABASE_ANON_KEY: 'sb_publishable_test',
      SUPABASE_URL,
      ...config,
      DEEPSEEK_BASE_URL: config.API_PROXY_URL ? `${config.API_PROXY_URL}/v1` : 'https://api.deepseek.com/v1',
    }));
    jest.doMock('../supabaseClient', () => ({
      supabase: { auth: { getSession: async () => ({ data: { session } }) } },
    }));
    client = require('../deepseekClient');
  });
  return client;
}

const okResponse = {
  ok: true,
  json: async () => ({ choices: [{ message: { content: 'hi' }, finish_reason: 'stop' }] }),
};

describe('deepseekClient', () => {
  const realDev = global.__DEV__;
  beforeEach(() => {
    global.fetch = jest.fn(async () => okResponse);
  });
  afterEach(() => {
    global.__DEV__ = realDev;
    delete global.fetch;
  });

  it('refuses to call DeepSeek directly in a release build, even with a key', async () => {
    const { chatCompletion } = loadClient({
      dev: false,
      config: { API_PROXY_URL: '', DEEPSEEK_API_KEY: 'sk-bundled' },
    });
    await expect(chatCompletion({ model: 'deepseek-flash', messages: [] })).rejects.toThrow(
      /release builds must set EXPO_PUBLIC_API_URL/
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sends the publishable key, session and install id - never a DeepSeek key - to ai-proxy', async () => {
    const { chatCompletion } = loadClient({
      dev: false,
      config: { API_PROXY_URL: PROXY_URL, DEEPSEEK_API_KEY: 'sk-bundled' },
      session: { access_token: 'user-jwt' },
    });
    await chatCompletion({ model: 'deepseek-flash', messages: [] }, { installId: 'abcdef1234567890' });

    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe(`${PROXY_URL}/v1/chat/completions`);
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      apikey: 'sb_publishable_test',
      Authorization: 'Bearer user-jwt',
      'X-Capwords-Install': 'abcdef1234567890',
    });
    expect(JSON.stringify(init)).not.toContain('sk-bundled');
  });

  it('omits Authorization for a signed-out caller', async () => {
    const { chatCompletion } = loadClient({ dev: false, config: { API_PROXY_URL: PROXY_URL } });
    await chatCompletion({ model: 'deepseek-flash', messages: [] });
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('still allows the direct shortcut in a development build', async () => {
    const { chatCompletion } = loadClient({
      dev: true,
      config: { API_PROXY_URL: '', DEEPSEEK_API_KEY: 'sk-dev' },
    });
    await chatCompletion({ model: 'deepseek-flash', messages: [] });
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.deepseek.com/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer sk-dev');
  });
});

describe('config/env', () => {
  const realDev = global.__DEV__;
  afterEach(() => {
    global.__DEV__ = realDev;
    delete process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY;
  });

  it('drops a bundled DeepSeek key outside __DEV__', () => {
    process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY = 'sk-bundled';
    global.__DEV__ = false;
    let env;
    jest.isolateModules(() => {
      env = require('../../config/env');
    });
    expect(env.DEEPSEEK_API_KEY).toBe('');
  });
});
