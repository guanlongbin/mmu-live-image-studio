import assert from 'node:assert/strict';
import test from 'node:test';
import {
    classifyError,
    createUploadWithRetry,
    sendWeblogEvent,
} from '../index.js';

function createOptions(overrides = {}) {
    return {
        pid: 'test-pid',
        token: 'test-token',
        cdnDir: 'test/static',
        files: ['/tmp/test-dist'],
        uid: 'tester',
        ...overrides,
    };
}

function createRunner({ results, events }) {
    let callCount = 0;
    class FakeUpload {
        async start() {
            const result = results[callCount++];
            if (result instanceof Error) throw result;
            return result;
        }
    }

    return {
        getCallCount: () => callCount,
        run: createUploadWithRetry({
            UploadClass: FakeUpload,
            report: async (key, value) => {
                // 模拟异步上报，验证上传函数在返回或抛错前会等待任务完成。
                await Promise.resolve();
                events.push({ key, value });
                return true;
            },
            delay: async () => {},
            createUploadId: () => 'test-upload-id',
        }),
    };
}

test('fatal 错误会等待 attempt 和 terminal 两条上报', async () => {
    const events = [];
    const authError = Object.assign(new Error('token错误'), { code: 10406 });
    const { run, getCallCount } = createRunner({ results: [authError], events });

    await assert.rejects(run(createOptions()), /KCDN 鉴权失败/);

    assert.equal(getCallCount(), 1);
    assert.deepEqual(events.map(({ key }) => key), [
        'CDN_UPLOAD_ATTEMPT_FAILED',
        'CDN_UPLOAD_FAILED',
    ]);
    assert.equal(events[1].value.reason, 'fatal');
    assert.equal(events[1].value.uploadId, 'test-upload-id');
});

test('重试耗尽会上报全部 attempt 和 exhausted 终态', async () => {
    const events = [];
    const { run, getCallCount } = createRunner({
        results: [new Error('network error'), new Error('network error')],
        events,
    });

    await assert.rejects(run(createOptions(), 2), /2 次尝试后仍失败/);

    assert.equal(getCallCount(), 2);
    assert.deepEqual(events.map(({ key }) => key), [
        'CDN_UPLOAD_ATTEMPT_FAILED',
        'CDN_UPLOAD_ATTEMPT_FAILED',
        'CDN_UPLOAD_FAILED',
    ]);
    assert.equal(events[2].value.reason, 'exhausted');
});

test('不可重试错误不会重复上传，并会上报终态', async () => {
    const events = [];
    const emptyFileError = Object.assign(new Error('empty file'), { code: 10427 });
    const { run, getCallCount } = createRunner({ results: [emptyFileError], events });

    await assert.rejects(run(createOptions()), /不可自动恢复/);

    assert.equal(getCallCount(), 1);
    assert.equal(events.at(-1).value.reason, 'non-retriable');
});

test('SDK 返回空 URL 列表时按不可重试失败上报', async () => {
    const events = [];
    const { run, getCallCount } = createRunner({ results: [[]], events });

    await assert.rejects(run(createOptions()), /未返回任何 CDN URL/);

    assert.equal(getCallCount(), 1);
    assert.equal(events.at(-1).value.reason, 'non-retriable');
});

test('参数预检失败不调用 SDK，并上报 precheck 终态', async () => {
    const events = [];
    const { run, getCallCount } = createRunner({ results: [], events });

    await assert.rejects(run(createOptions({ token: '' })), /token 不能为空/);

    assert.equal(getCallCount(), 0);
    assert.equal(events.length, 1);
    assert.equal(events[0].key, 'CDN_UPLOAD_FAILED');
    assert.equal(events[0].value.reason, 'precheck');
});

test('重试后成功仍会等待之前的失败事件上报', async () => {
    const events = [];
    const { run } = createRunner({
        results: [new Error('temporary error'), ['https://cdn.test/file.js']],
        events,
    });

    const urls = await run(createOptions(), 2);

    assert.deepEqual(urls, ['https://cdn.test/file.js']);
    assert.deepEqual(events.map(({ key }) => key), ['CDN_UPLOAD_ATTEMPT_FAILED']);
});

test('sendWeblogEvent 使用立即发送并等待 SDK 回调', async () => {
    const calls = [];
    const weblog = {
        sendImmediately(type, event) {
            calls.push({ type, key: event.key, value: event.value });
            event.callback();
        },
    };

    const success = await sendWeblogEvent(weblog, 'TEST_EVENT', { ok: true }, 100);

    assert.equal(success, true);
    assert.deepEqual(calls, [{ type: 'CUSTOM', key: 'TEST_EVENT', value: { ok: true } }]);
});

test('sendWeblogEvent 超时会返回失败，不会无限阻塞 CLI', async () => {
    const weblog = { sendImmediately() {} };

    const success = await sendWeblogEvent(weblog, 'TIMEOUT_EVENT', {}, 10);

    assert.equal(success, false);
});

test('强制关闭 KCDN SDK 的进程退出和吞错配置', async () => {
    let receivedOptions;
    class FakeUpload {
        constructor(options) {
            receivedOptions = options;
        }

        async start() {
            return ['https://cdn.test/file.js'];
        }
    }
    const run = createUploadWithRetry({
        UploadClass: FakeUpload,
        report: async () => true,
        createUploadId: () => 'test-upload-id',
    });

    await run(createOptions({ exitOnApiError: 'never', exitProcessOnError: true }));

    assert.equal(receivedOptions.exitOnApiError, 'unknown');
    assert.equal(receivedOptions.exitProcessOnError, false);
});

test('循环引用异常对象不会破坏错误分类', () => {
    const error = {};
    error.self = error;

    assert.deepEqual(classifyError(error), { kind: 'retriable', code: null });
});
