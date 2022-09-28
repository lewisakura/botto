import { v4 as uuid } from 'uuid';
import { CommandContext } from '../../types';
import axios from 'axios';

async function* getUsers(groupId: number) {
    let nextPageCursor = null;
    do {
        const data: { data: { user: { userId: number } }[]; nextPageCursor: string | null } = (
            await axios.get(
                `https://groups.roblox.com/v1/groups/${groupId}/users?limit=100&cursor=${nextPageCursor || ''}`
            )
        ).data;
        for (const user of data.data) {
            yield user.user.userId;
        }

        nextPageCursor = data.nextPageCursor;
    } while (nextPageCursor);
}

function waitForBan(ctx: CommandContext, id: string): Promise<string> {
    return new Promise(res => {
        const callback = async (resId: string, response: string) => {
            if (resId !== id) return;

            ctx.pollServerEmitter.removeListener('commandResponse', callback);
            res(response);
        };

        ctx.pollServerEmitter.on('commandResponse', callback);
    });
}

async function exec(ctx: CommandContext) {
    if (ctx.args.length < 2) {
        return ctx.reply(ctx.config.emoji.error + ' You need a group ID and some reason.');
    }

    const groupId = parseInt(ctx.args.shift());
    if (isNaN(groupId)) {
        return ctx.reply(ctx.config.emoji.error + ' You need to supply a valid group ID.');
    }

    const reason = ctx.args.join(' ');

    await ctx.reply(
        {
            content: `@everyone ${ctx.msg.author.mention} started a massban against group ${groupId} for: ${reason}`,
            allowedMentions: { everyone: true }
        },
        ctx.config.banLogsChannel
    );

    const m = await ctx.reply(`${ctx.config.emoji.loading} Processing bans, please wait...`);

    let banned = 0;
    let failed = 0;
    let updateTimeout = setInterval(
        () => m.edit(`${ctx.config.emoji.loading} Processing bans, please wait... (${banned} : ${failed})`),
        10000
    );
    for await (const user of getUsers(groupId)) {
        const id = uuid();

        const commandData = JSON.stringify({
            UserBanning: '1042182', // BOTTO!
            UserBanned: user,
            Reason: reason
        });
        const messageToRobloxServer = JSON.stringify({ Command: 'pban', CommandData: commandData });

        ctx.serverCommands.push({
            id,
            command: messageToRobloxServer
        });

        if ((await waitForBan(ctx, id)).endsWith('banned successfully.')) {
            banned++;
        } else {
            failed++;
        }
    }
    clearTimeout(updateTimeout);

    await m.delete();

    return ctx.reply({
        content: ctx.config.emoji.success + ` ${banned} users banned, ${failed} failed to be processed.`,
        allowedMentions: { repliedUser: true }
    });
}

export default {
    name: 'groupban',
    description: 'Bans users in bulk based on a ROBLOX group.',
    usage: '<groupId> <reason>',
    exec,
    level: 4
};
