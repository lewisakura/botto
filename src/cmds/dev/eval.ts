import { exec as execSync } from 'child_process';
import util from 'util';
import { CommandContext } from '../../types';
import hastebin from 'hastebin';

const execAsync = util.promisify(execSync);

async function system(command: string) {
    const outputs = await execAsync(command);
    return { __bottoParseAsSystem: true, stdout: outputs.stdout, stderr: outputs.stderr };
}

async function exec(ctx: CommandContext) {
    const code = ctx.args.join(' ');

    let func: any;

    try {
        func = eval(`(async () => {${code}})`);
    } catch (e) {
        return await ctx.reply(ctx.config.emoji.error + ' Syntax error\n```typescript\n' + e + '\n```');
    }

    let result: any;

    try {
        result = await func();
    } catch (e) {
        return await ctx.reply(ctx.config.emoji.error + ' Runtime error\n```typescript\n' + e + '\n```');
    }
    
    let finalResult = util.inspect(result).replace(new RegExp(ctx.config.token, 'g'), '');
    
    if (result?.__bottoParseAsSystem === true) {
        finalResult = `stdout:\n${result.stdout.replace(new RegExp(ctx.config.token, 'g'), '')}\n\x1B[0mstderr:\n${result.stderr.replace(new RegExp(ctx.config.token, 'g'), '')}`;
    }

    if (finalResult.length > 1750) {
        const hastebinLink = await hastebin.createPaste(finalResult, {
            server: 'https://haste.lewistehminerz.dev/'
        });
        return await ctx.reply(ctx.config.emoji.success + ' Output too long: ' + hastebinLink);
    }

    return await ctx.reply(`${ctx.config.emoji.success}\n\`\`\`${result?.__bottoParseAsSystem ? 'ansi' : 'typescript'}\n${finalResult}\n\`\`\``);
}

export default {
    name: 'eval',
    description: 'Evaluate JavaScript code',
    usage: '<code>',

    exec,
    level: 5
};
