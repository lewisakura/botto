import chalk from 'chalk';

function log(level: string, ...args: any[]) {
    console.log(new Date().toISOString().replace('T', ' ').substr(0, 19), '│', level, '│', ...args);
}

const levels = {
    debug: chalk.cyan('[DEBUG]'),
    info: chalk.green('[INFO] '),
    warn: chalk.yellow('[WARN] '),
    error: chalk.red('[ERROR]')
};

export function debug(...args: any[]) {
    log(levels.debug, ...args);
}

export function info(...args: any[]) {
    log(levels.info, ...args);
}

export function warn(...args: any[]) {
    log(levels.warn, ...args);
}

export function error(...args: any[]) {
    log(levels.error, ...args);
}
