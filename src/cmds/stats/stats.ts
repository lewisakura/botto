import axios from 'axios';
import { CommandContext } from '../../types';

async function exec(ctx: CommandContext) {
    if (ctx.args.length < 1) {
        return ctx.reply(ctx.config.emoji.error + ' Not enough arguments');
    }

    const username = ctx.args[0];

    const msg = await ctx.reply(ctx.config.emoji.loading + ' Loading information...');

    const potentialRobloxUser = (await axios.get('https://api.roblox.com/users/get-by-username?username=' + username))
        .data;

    if (!potentialRobloxUser.Id) {
        return await msg.edit(ctx.config.emoji.error + ' Unknown user.');
    }

    const id = potentialRobloxUser.Id.toString();

    let potentialData: any;

    try {
        potentialData = (await axios.get('https://zo.lewistehminerz.dev/leaderboard/' + id)).data;
    } catch {
        return await msg.edit(ctx.config.emoji.error + ' Unable to fetch data for user.');
    }

    return await msg.edit({
        content: '',
        embed: {
            title: potentialData.name,
            color: 0xe7ae54,
            fields: [
                {
                    name: 'Kills',
                    value: potentialData.kills.toLocaleString(),
                    inline: true
                },
                {
                    name: 'Souls',
                    value: potentialData.souls.toLocaleString(),
                    inline: true
                },
                {
                    name: 'Leaderboard Position',
                    value: '#' + potentialData.position.toLocaleString()
                }
            ],
            thumbnail: {
                url: `https://www.roblox.com/headshot-thumbnail/image?userId=${id}&width=420&height=420&format=png`
            }
        }
    });
}

export default {
    name: 'stats',
    description: "Get a player's statistics.",
    exec,
    level: 0
};
