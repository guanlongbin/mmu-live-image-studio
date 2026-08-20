import { spawnSync } from 'node:child_process';

const SUPPORTED_COMMANDS = new Set(['dev', 'build']);
const SUPPORTED_REGIONS = new Set(['prod', 'sgp']);

const [command, regionArg, ...extraArgs] = process.argv.slice(2);
const region = regionArg || 'prod';

if (!SUPPORTED_COMMANDS.has(command)) {
    console.error(`[app] 无效指令 "${command || ''}"，仅支持 dev、build`);
    process.exit(1);
}

if (extraArgs.length > 0 || !SUPPORTED_REGIONS.has(region)) {
    const receivedArgs = [regionArg, ...extraArgs].filter(Boolean).join(' ');
    console.error(`[app] 无效环境参数 "${receivedArgs}"，仅支持 prod、sgp`);
    process.exit(1);
}

const env = {
    ...process.env,
    DATA_AGENT_REGION: region,
    BUILD_MODE: command === 'build' ? 'build' : '',
};

const run = (executable, args) => {
    const result = spawnSync(executable, args, {
        stdio: 'inherit',
        env,
    });

    if (result.error) {
        console.error(`[app] 无法执行 ${executable}: ${result.error.message}`);
        return 1;
    }

    if (result.signal) {
        console.error(`[app] ${executable} 被信号 ${result.signal} 终止`);
        return 1;
    }

    return result.status ?? 1;
};

console.log(`[app] command=${command}, region=${region}`);

const rsbuildExitCode = run('rsbuild', [command]);
if (rsbuildExitCode !== 0) {
    process.exit(rsbuildExitCode);
}

if (command === 'build') {
    process.exit(run('ks-upload-cdn', []));
}
