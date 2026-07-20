(function () {
    "use strict";

    const projectKey = "phc_kiUKQpr5DR7DC35huq3pczjKqKV6qBsAsB5FdmtBkxRg";
    const apiHost = "https://us.i.posthog.com";

    window.analytics = {
        track(eventName, properties = {}) {
            try {
                if (window.posthog && typeof window.posthog.capture === "function") {
                    window.posthog.capture(eventName, properties);
                }
            } catch (error) {
                console.warn("Analytics event was not sent.", error);
            }
        }
    };

    try {
        if (window.posthog && window.posthog.__loaded) return;

        !function(t,e){var o,n,p,r;e.__SV||(window.posthog&&window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once unregister identify alias people set_config reset get_distinct_id get_session_id captureException".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

        window.posthog.init(projectKey, {
            api_host: apiHost,
            defaults: "2026-05-30",
            person_profiles: "identified_only",
            capture_pageview: true,
            capture_pageleave: true,
            autocapture: false,
            disable_session_recording: true
        });
    } catch (error) {
        console.warn("Analytics could not be initialized.", error);
    }
})();
