import { CommandContext } from '../../types';

async function exec(ctx: CommandContext) {
    const whitelist = ['372535688106737665', '158392456746893312'];

    if (ctx.userStaffLevel < 1) {
        let found = false;
        for (const whitelisted of whitelist) {
            if (ctx.msg.member.id === whitelisted) {
                found = true;
                break;
            }
        }

        if (!found) {
            return await ctx.reply(
                ctx.config.emoji.error +
                    ' You do not have the required permissions to execute this command (need staff level 1/whitelist, you are staff level 0/unwhitelisted).'
            );
        }
    }

    ctx.reply('https://i.pinimg.com/originals/76/3a/93/763a93abf3f00f780f58ce5ead71a248.gif');
}

export default {
    name: 'johncena',
    description: "You can't see me.",

    exec,
    level: 0
};
