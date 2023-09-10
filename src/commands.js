/**
 * Share command metadata from a common spot to be used for both runtime
 * and registration.
 */

export const AO3_COMMAND = {
  type: 1,
  name: "ao3",
  description: "Get summary of an AO3 url",
  options: [
    {
      type: 3,
      name: "url",
      description: "The url",
      required: true
    }
  ]
};

export const INVITE_COMMAND = {
  type: 1,
  name: "invite",
  description: "Get an invite link to add the bot to your server",
};
