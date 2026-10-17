import{t as e}from"./jsx-runtime-BX5dh3L7.js";var t=e();function n(e){let n={p:`p`,...e.components},{Box:r,Calc:a,Grid:o,Header:s,Splat:c,Talk:l,Term:u}=n;return r||i(`Box`,!0),a||i(`Calc`,!0),o||i(`Grid`,!0),s||i(`Header`,!0),c||i(`Splat`,!0),l||i(`Talk`,!0),u||i(`Term`,!0),(0,t.jsxs)(t.Fragment,{children:[`
`,(0,t.jsx)(s,{children:`Why the Concentration Cancels: Details Part 2`}),`
`,(0,t.jsxs)(o,{children:[(0,t.jsxs)(r,{tone:`a`,span:!0,step:7,children:[(0,t.jsx)(n.p,{children:`Four steps. Follow them in order and the result is unavoidable.`}),(0,t.jsx)(a,{children:`[[b:Step 1.]] Split the distribution into "how many" × "what shape":

      N(D) = [[s:N_{w}]] × n(D ; [[s:D_{m}]])
[[cm:                   ↑ a number      ↑ a curve whose shape depends only on Dm]]`}),(0,t.jsx)(a,{children:`[[b:Step 2.]] Reflectivity is an integral over N(D), and [[s:N_{w}]] is just a constant
        multiplier, so it comes straight out of the integral:

      Z([[kut:Ku]]) = [[s:N_{w}]] × I_{Ku}([[s:D_{m}]])
      Z([[kat:Ka]]) = [[s:N_{w}]] × I_{Ka}([[s:D_{m}]])
[[cm:                        ↑ these two differ — that is the whole point]]`}),(0,t.jsx)(a,{children:`[[b:Step 3.]] A difference of logs is the log of a ratio:

      DFR = 10 log_{10} Z([[kut:Ku]]) − 10 log_{10} Z([[kat:Ka]]) = 10 log_{10} [ Z([[kut:Ku]]) / Z([[kat:Ka]]) ]`}),(0,t.jsx)(a,{children:`[[b:Step 4.]] Substitute Step 2 into Step 3:

                      [[s:N_{w}]] × I_{Ku}([[s:D_{m}]])              I_{Ku}([[s:D_{m}]])
      DFR = 10 log_{10} ───────────────── = 10 log_{10} ──────────
                      [[s:N_{w}]] × I_{Ka}([[s:D_{m}]])              I_{Ka}([[s:D_{m}]])`}),(0,t.jsxs)(n.p,{children:[`The `,(0,t.jsxs)(`span`,{className:`sv`,children:[`N`,(0,t.jsx)(`sub`,{children:`w`})]}),` on the top and the `,(0,t.jsxs)(`span`,{className:`sv`,children:[`N`,(0,t.jsx)(`sub`,{children:`w`})]}),` on the bottom are the same number. They cancel. Exactly, not approximately.`]}),(0,t.jsx)(c,{children:`DOUBLE SPLAT!!!`})]}),(0,t.jsxs)(r,{tone:`d`,span:!0,step:8,children:[(0,t.jsx)(l,{char:`dot`,children:`So if you double the number of us without changing our sizes, both your echoes double, and the ratio doesn't move.`}),(0,t.jsxs)(l,{char:`core`,children:[`Exactly. Which means `,(0,t.jsx)(u,{id:`dfr`,children:`DFR`}),` is a pure size gauge. Go to the next page and try to break it — move the N`,(0,t.jsx)(`sub`,{children:`w`}),` slider as far as it goes and watch the DFR readout refuse to budge.`]})]})]})]})}function r(e={}){let{wrapper:r}=e.components||{};return r?(0,t.jsx)(r,{...e,children:(0,t.jsx)(n,{...e})}):n(e)}function i(e,t){throw Error(`Expected `+(t?`component`:`object`)+" `"+e+"` to be defined: you likely forgot to import, pass, or provide it.")}export{r as default};