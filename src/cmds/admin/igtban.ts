import { v4 as uuid } from 'uuid';
import { CommandContext } from '../../types';
import axios from 'axios';

async function exec(ctx: CommandContext) {
    if (ctx.args.length < 1) {
        return ctx.reply(ctx.config.emoji.error + ' You need to supply arguments to `-tban`.');
    }

    const id = uuid();
    const unbanName = ctx.args.shift();
    const timeBan = ctx.args.shift();
    if (isNaN(Number(timeBan)) || Number(timeBan) <= 0) {
        await ctx.reply({
            content: `${timeBan} is not a valid time value. Value must be an integer or decimal, and must be above 0.`,
            allowedMentions: { repliedUser: true }
        }); // Use a new message to properly ping the user
        return;
    }
    if (!ctx.args[0]) {
        ctx.args.push('(No reason specified.)');
    }
    const reason = ctx.args.join(' ');
    const bannerInfo = (await axios.get('https://verify.eryn.io/api/user/' + ctx.msg.author.id)).data;
    const robloxUserOfBanner = bannerInfo.robloxId.toString();
    const commandData = JSON.stringify({ UserBanning: robloxUserOfBanner, UserBanned: unbanName, TimeToBan: Number(timeBan), Reason: reason});
    const messageToRobloxServer = JSON.stringify({ Command: 'tban', CommandData: commandData });
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
        }); // Use a new message to properly ping the user
    };

    ctx.pollServerEmitter.on('commandResponse', callback);
    ctx.serverCommands.push({
        id,
        command: messageToRobloxServer
    });
}

export default {
    name: 'igtban',
    description: 'Temporarily bans a user from the game.',
    usage: '<username> <timeInDays(accepts decimals)> <reason>',
    exec,
    level: 1
};
