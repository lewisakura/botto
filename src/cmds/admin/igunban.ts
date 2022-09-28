import { v4 as uuid } from 'uuid';
import { CommandContext } from '../../types';
import axios from 'axios';

async function exec(ctx: CommandContext) {
    if (ctx.args.length < 1) {
        return ctx.reply(ctx.config.emoji.error + ' You need to supply arguments to `-unban`.');
    }

    const id = uuid();
    const unbanName = ctx.args.shift();
    const bannerInfo = (await axios.get('https://verify.eryn.io/api/user/' + ctx.msg.author.id)).data;
    const robloxUserOfBanner = bannerInfo.robloxId.toString();
    const commandData = JSON.stringify({ UserUnbanning: robloxUserOfBanner, UserUnbanned: unbanName });
    const messageToRobloxServer = JSON.stringify({ Command: 'unban', CommandData: commandData });
    let message = await ctx.reply(ctx.config.emoji.loading + ' Queued command to ROBLOX servers. Waiting for execution...');

    const callback = async (resId: string, response: string) => {
        if (resId !== id) return;

        ctx.pollServerEmitter.removeListener('commandResponse', callback);
        message.delete();
        message = await ctx.reply({
            content: ctx.config.emoji.success + ` ${response}`,
            allowedMentions: { repliedUser: true }
        }); //Use a new message to properly ping the user
    };

    ctx.pollServerEmitter.on('commandResponse', callback);
    ctx.serverCommands.push({
        id,
        command: messageToRobloxServer
    });
}

export default {
    name: 'igunban',
    description: 'Unbans a user ingame.',
    usage: '<username>',
    exec,
    level: 2
};
