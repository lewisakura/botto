import { v4 as uuid } from 'uuid';
import { CommandContext } from '../../types';
import axios from 'axios';

async function exec(ctx: CommandContext) {
    if (ctx.args.length < 1) {
        return ctx.reply(ctx.config.emoji.error + ' You need to supply arguments to `-igks`.');
    }

    const id = uuid();
    const idToGet = ctx.args.shift();
    const commandData = JSON.stringify({UserIDToGet: idToGet });
    const messageToRobloxServer = JSON.stringify({ Command: 'killsound', CommandData: commandData });
    let message = await ctx.reply(ctx.config.emoji.loading + ' Queued command to ROBLOX servers. Waiting for execution...');

    const callback = async (resId: string, response: string) => {
        if (resId !== id) return;

        ctx.pollServerEmitter.removeListener('commandResponse', callback);
        if (response === "InvalidUSR/NoPlay") {
            message.delete();
            message = await ctx.reply({
                content: `Invalid Username or UserID supplied, or the user has never played ZO before.`,
                allowedMentions: { repliedUser: true }
            }); //Use a new message to properly ping the user
            return;
        }

        if (response.toString().length < 3) {
            message.delete();
            ctx.reply({
                content: ctx.config.emoji.success + ` ${response.toString().length < 3 ? "(Default)" : response}`,
                allowedMentions: { repliedUser: true },
            });
            return;
        }

        let res = await axios({url: `https://www.roblox.com/library/${response}`, method: "GET", responseType: "text"});

        let match = res.data.find(/(?:data-mediathumb-url=")(.*)(?=">)/g);
        message.delete();
            ctx.reply({
                content: match,//ctx.config.emoji.success + ` ${response.toString().length < 3 ? "(Default)" : response}`,
                allowedMentions: { repliedUser: true },
                /*file: {
                    file: res.data,
                    name: 'User\'s Kill Audio.mp3'
                }*/
            }); //Use a new message to properly ping the user
            return;

        message.delete();
            ctx.reply({
                content: ctx.config.emoji.success + ` ${response.toString().length < 3 ? "(Default)" : response}`,
                allowedMentions: { repliedUser: true },
                file: {
                    file: res.data,
                    name: 'User\'s Kill Audio.mp3'
                }
            }); //Use a new message to properly ping the user


    };

    ctx.pollServerEmitter.on('commandResponse', callback);
    ctx.serverCommands.push({
        id,
        command: messageToRobloxServer
    });
}

export default {
    name: 'igks',
    description: 'Gets a user\'s in-game kill sound.',
    usage: '<username|userid>',
    exec,
    level: 2
};
