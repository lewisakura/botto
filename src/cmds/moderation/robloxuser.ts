import axios from 'axios';
import { CommandContext } from '../../types';

async function exec(ctx: CommandContext) {
    if (ctx.args.length < 1) {
        return ctx.reply(ctx.config.emoji.error + ' Not enough arguments');
    }

    const snowflake = /(?:<@!?)?(\d+)>?/.exec(ctx.args[0])?.[1] || ctx.args[0];

    const msg = await ctx.reply(ctx.config.emoji.loading + ' Loading information...');

    try {
        const info = (await axios.get('https://verify.eryn.io/api/user/' + snowflake)).data;
        const robloxUserInfo = (await axios.get('https://users.roblox.com/v1/users/' + info.robloxId)).data;
        return await msg.edit({
            content: ctx.config.emoji.success,
            embed: {
                title: robloxUserInfo.name,
                description: `[Profile Link](https://roblox.com/users/${
                    info.robloxId
                }/profile "Click here to visit this user's profile.")\n${
                    robloxUserInfo.isBanned
                        ? ctx.config.emoji.error + ' This user is currently banned from Roblox.'
                        : ''
                }`,
                color: 0xe7ae54,
                fields: [
                    {
                        name: 'Username',
                        value: `\`${robloxUserInfo.name}\``,
                        inline: true
                    },
                    {
                        name: 'Display Name',
                        value: `\`${robloxUserInfo.displayName}\``,
                        inline: true
                    },
                    {
                        name: 'ID',
                        value: `\`${info.robloxId}\``,
                        inline: true
                    },
                    {
                        name: 'Description',
                        value: robloxUserInfo.description || '*No description provided.*',
                        inline: true
                    }
                ],
                thumbnail: {
                    url: `https://www.roblox.com/headshot-thumbnail/image?userId=${info.robloxId}&width=420&height=420&format=png`
                }
            }
        });
    } catch (e) {
        if (e.message === 'Request failed with status code 404') {
            return await msg.edit(ctx.config.emoji.error + ' Failed to resolve user.');
        } else {
            throw e;
        }
    }
}

export default {
    name: 'robloxuser',
    description: 'Forcefully look up a Discord ID against RoVer.',
    usage: '<discord ID(1)>',

    exec,
    level: 1
};
