import { AutoRouter  } from "itty-router";
import {
  InteractionResponseType,
  InteractionType,
  verifyKey,
} from "discord-interactions";
import { AO3_COMMAND, INVITE_COMMAND } from "./commands.js";
import { InteractionResponseFlags } from "discord-interactions";

async function verifyDiscordRequest(request, env) {
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  const body = await request.text();
  const isValidRequest =
      signature &&
      timestamp &&
      await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);
  if (!isValidRequest) {
    return { isValid: false };
  }

  return { interaction: JSON.parse(body), isValid: true };
}

const router = AutoRouter();

/**
 * A simple :wave: hello page to verify the worker is working.
 */
router.get("/", (request, env) => {
  return `👋 ${env.DISCORD_APPLICATION_ID}`;
});

/**
 * Main route for all requests sent from Discord.  All incoming messages will
 * include a JSON payload described here:
 * https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-object
 */
router.post("/", async (request, env) => {
  const { isValid, interaction } = await verifyDiscordRequest(request, env);
  if (!isValid || !interaction) {
    return new Response("Bad request signature.", { status: 401 });
  }

  if (interaction.type === InteractionType.PING) {
    // The `PING` message is used during the initial webhook handshake, and is
    // required to configure the webhook in the developer portal.
    return {
      type: InteractionResponseType.PONG,
    };
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    // Most user commands will come as `APPLICATION_COMMAND`.
    switch (interaction.data.name.toLowerCase()) {
      case AO3_COMMAND.name.toLowerCase(): {
        const ao3Url = interaction.data.options[0].value;

        console.log(`Received request for AO3 summary: ${ao3Url}`);

        try {
          const ao3UrlRegex = /^(?:http(s)?:\/\/)?(archiveofourown\.org\/works\/)([0-9]+).*$/i

          if (!ao3Url.match(ao3UrlRegex)) {
            console.log(`URL was not an ao3 url: ${ao3Url}`);
            return {
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: "Unrecognized AO3 url"
              }
            };
          }

          const apiRequest = JSON.stringify({
            apiKey: env.AO3_SUMMARY_API_KEY,
            ao3Url: ao3Url,
            webhookUrl: `https://discordapp.com/api/webhooks/${env.DISCORD_APPLICATION_ID}/${interaction.token}/messages/@original`
          });

          const fetchResponse = await fetch(env.AO3_MICROSERVICE_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: apiRequest
          });

          console.log(`Received status=${fetchResponse.status} from AO3 Summary API`);

          if (fetchResponse.status === 400) {
            return {
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: "Unrecognized Request"
              }
            };
          } else if (fetchResponse.status === 200) {
            return {
              type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
            };
          }
        } catch (e) {
          console.error(e);
        }

        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "Please try again later"
          }
        };
      }
      case INVITE_COMMAND.name.toLowerCase(): {
        const applicationId = env.DISCORD_APPLICATION_ID;
        const INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${applicationId}&scope=applications.commands`;
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: INVITE_URL,
            flags: InteractionResponseFlags.EPHEMERAL,
          }
        };
      }
      default:
        return new Response({ error: "Unknown Type" }, { status: 400 });
    }
  }

  return new Response({ error: "Unknown Type" }, { status: 400 });
});

export default router;
