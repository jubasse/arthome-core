/** What a route that reads the caller's profile says on the service, beside its public operation's docs. */
export const PROFILE_FROM_THE_TOKEN =
  "**On the service, the profile is the token's** (`pro`), never the body's: a call whose token names\nno profile is refused `403` `api.forbidden`, and so is a body `profileId` other than the token's.\n";
