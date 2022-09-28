import { CommandContext } from '../../types';

export default {
    name: 'streamable',
    description: 'Posts a link to the Streamable tutorial.',

    exec(ctx: CommandContext) {
        ctx.reply(
            'ℹ️ Please watch the following tutorial on how to upload your video to Streamable: https://cdn.discordapp.com/attachments/860329098186326046/868166101903740988/streamable_tutorial.mp4'
        );
    },
    level: 1
};
