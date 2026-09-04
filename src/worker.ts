import { handle } from "@astrojs/cloudflare/handler";
import { redirectInsecure } from "./lib/redirect";

type HandlerArgs = Parameters<typeof handle>;

export default {
  fetch(request: HandlerArgs[0], env: HandlerArgs[1], context: HandlerArgs[2]) {
    // Redirect before Astro's scheme-agnostic route cache can answer.
    const redirect = redirectInsecure(request);
    if (redirect !== null) return redirect;

    return handle(request, env, context);
  },
};
