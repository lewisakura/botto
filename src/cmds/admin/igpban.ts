import { v4 as uuid } from 'uuid';
import { CommandContext } from '../../types';
import axios from 'axios';

async function exec(ctx: CommandContext) {
    if (ctx.args.length < 1) {
        return ctx.reply(ctx.config.emoji.error + ' You need to supply arguments to `-pban`.');
    }

    const id = uuid();
    //const message = await ctx.reply(ctx.config.emoji.success + ' Ban has been queued. Awaiting server response.');
    const banName = ctx.args.shift();
    const banReason = ctx.args.join(' ');
    const bannerInfo = (await axios.get('https://verify.eryn.io/api/user/' + ctx.msg.author.id)).data;
    const robloxUserOfBanner = bannerInfo.robloxId.toString();
    const commandData = JSON.stringify({ UserBanning: robloxUserOfBanner, UserBanned: banName, Reason: banReason });
    const messageToRobloxServer = JSON.stringify({ Command: 'pban', CommandData: commandData });
    let message = await ctx.reply(
        ctx.config.emoji.loading + ' Queued command to ROBLOX servers. Waiting for execution...'
    );

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
    name: 'igpban',
    description: 'Bans a user ingame forever.',
    usage: '<username> <reason>',
    exec,
    level: 2
};
