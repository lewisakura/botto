import axios from 'axios';
import { CommandContext } from '../../types';

async function exec(ctx: CommandContext) {
    if (ctx.args.length < 1) {
        return ctx.reply(ctx.config.emoji.error + ' Not enough arguments');
    }

    const msg = await ctx.reply(ctx.config.emoji.loading + ' Loading information...');

    const username = ctx.args[0];

    const potentialRobloxUser = (await axios.get('https://api.roblox.com/users/get-by-username?username=' + username))
        .data;

    if (!potentialRobloxUser.Id) {
        return await msg.edit(ctx.config.emoji.error + ' Unknown user.');
    }

    const id = potentialRobloxUser.Id.toString();

    const [userInfo, usernameHistory] = await Promise.all([
        axios.get('https://users.roblox.com/v1/users/' + id).then(res => res.data),
        axios
            .get('https://users.roblox.com/v1/users/' + id + '/username-history?limit=25&sortOrder=Desc')
            .then(res => res.data)
    ]);

    let usernameResults = `**Username History:**\n\n`;

    const history = usernameHistory.data as { name: string }[];
    usernameResults += `- **${userInfo.name}`;
    if (userInfo.displayName !== userInfo.name) {
        usernameResults += ` (display: ${userInfo.displayName})`;
    }
    usernameResults += '**';

    for (const item of history) {
        usernameResults += `\n- ${item.name}`;
    }

    if (usernameHistory.nextPageCursor) {
        usernameResults += `\n(too many to list fully)`;
    }

    return msg.edit(usernameResults);
}

export default {
    name: 'alias',
    aliases: ['aliases', 'usernamehistory', 'history'],
    description: "Get a user's past usernames.",
    usage: '<roblox user(1)>',

    exec,
    level: 1
};
