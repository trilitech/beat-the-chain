import type { Metadata } from "next";
import { Inter, Roboto_Mono, Racing_Sans_One, Sedgwick_Ave_Display } from "next/font/google";
import "./globals.css";

// Setup font variables
const inter = Inter({ 
  subsets: ["latin"], 
  variable: '--font-inter' 
});
const robotoMono = Roboto_Mono({ 
  subsets: ["latin"], 
  variable: '--font-roboto-mono' 
});
const racingSansOne = Racing_Sans_One({ 
  subsets: ["latin"], 
  weight: "400",
  variable: '--font-racing-sans-one' 
});
const sedgwickAveDisplay = Sedgwick_Ave_Display({ 
  subsets: ["latin"], 
  weight: "400",
  variable: '--font-sedgwick-ave-display' 
});

export const metadata: Metadata = {
  title: "Etherlink - Proof of Speed",
  description: "Beat Etherlink Instant confirmations with this typing speed test.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* NO Myna UI scripts here. 
        We will import them as components.
      */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(t,e){var o,n,p,r;e.__SV||(window.posthog && window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init ss us bi os hs es ns capture Bi calculateEventProperties cs register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey displaySurvey cancelPendingSurvey canRenderSurvey canRenderSurveyAsync identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException startExceptionAutocapture stopExceptionAutocapture loadToolbar get_property getSessionProperty ps vs createPersonProfile gs Zr ys opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing get_explicit_consent_status is_capturing clear_opt_in_out_capturing ds debug O fs getPageViewId captureTraceFeedback captureTraceMetric Yr".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    posthog.init('phc_8WGj4Y279IFJFnjObPj8XZ73QLSG0x9YU7YnWgavH4o', {
        api_host: 'https://us.i.posthog.com',
        defaults: '2025-11-30',
        person_profiles: 'identified_only',
    });`,
          }}
        />
      </head>
      {/* Apply the font variables to the body */}
      <body className={`${inter.variable} ${robotoMono.variable} ${racingSansOne.variable} ${sedgwickAveDisplay.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
