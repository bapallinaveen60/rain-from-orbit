import{t as e}from"./jsx-runtime-BX5dh3L7.js";var t=e(),n=`<svg class="fig" viewBox="0 0 760 210" role="img" aria-label="A radiometer sums the whole column into one number; a radar resolves the column into range bins" xmlns="http://www.w3.org/2000/svg">
          <g filter="url(#rf2)" stroke="var(--line)" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <text x="20" y="22" font-family="'Nunito Sans',sans-serif" font-weight="800" font-size="15" fill="var(--ink)" stroke="none">RADIOMETER — one number per column</text>
            <text x="420" y="22" font-family="'Nunito Sans',sans-serif" font-weight="800" font-size="15" fill="var(--ink)" stroke="none">RADAR — one number per range bin</text>
            <rect x="60" y="42" width="110" height="128" rx="6" fill="var(--tint-b)"></rect>
            <path d="M115 42 L115 170" stroke-dasharray="5 5" opacity=".5"></path>
            <circle cx="88" cy="70" r="7" fill="var(--dot-fill)"></circle><circle cx="140" cy="96" r="9" fill="var(--dot-fill)"></circle>
            <circle cx="96" cy="128" r="6" fill="var(--dot-fill)"></circle><circle cx="138" cy="150" r="8" fill="var(--dot-fill)"></circle>
            <path d="M200 106 L250 106" stroke="var(--flow)" stroke-width="3.4"></path>
            <path d="M240 99 L250 106 L240 113" stroke="var(--flow)" stroke-width="3.4"></path>
            <rect x="262" y="88" width="96" height="36" rx="7" fill="var(--page)"></rect>
            <text x="310" y="112" font-family="'IBM Plex Mono',monospace" font-size="16" font-weight="600" fill="var(--obs)" stroke="none" text-anchor="middle">1 number</text>
            <rect x="460" y="42" width="110" height="128" rx="6" fill="var(--tint-b)"></rect>
            <path d="M460 58 H570 M460 74 H570 M460 90 H570 M460 106 H570 M460 122 H570 M460 138 H570 M460 154 H570" stroke="var(--line-soft)" stroke-width="1.6"></path>
            <circle cx="488" cy="70" r="7" fill="var(--dot-fill)"></circle><circle cx="540" cy="96" r="9" fill="var(--dot-fill)"></circle>
            <circle cx="496" cy="128" r="6" fill="var(--dot-fill)"></circle><circle cx="538" cy="150" r="8" fill="var(--dot-fill)"></circle>
            <path d="M598 106 L648 106" stroke="var(--flow)" stroke-width="3.4"></path>
            <path d="M638 99 L648 106 L638 113" stroke="var(--flow)" stroke-width="3.4"></path>
            <rect x="660" y="60" width="86" height="92" rx="7" fill="var(--page)"></rect>
            <text x="703" y="88" font-family="'IBM Plex Mono',monospace" font-size="15" font-weight="600" fill="var(--obs)" stroke="none" text-anchor="middle">a whole</text>
            <text x="703" y="108" font-family="'IBM Plex Mono',monospace" font-size="15" font-weight="600" fill="var(--obs)" stroke="none" text-anchor="middle">profile</text>
            <text x="703" y="131" font-family="'Caveat',cursive" font-size="17" fill="var(--ink2)" stroke="none" text-anchor="middle">176 bins</text>
          </g>
        </svg>
`;function r(e){let r={em:`em`,p:`p`,strong:`strong`,...e.components},{Box:i,Calc:o,Grid:s,Header:c,InlineSvg:l,Talk:u,Term:d}=r;return i||a(`Box`,!0),o||a(`Calc`,!0),s||a(`Grid`,!0),c||a(`Header`,!0),l||a(`InlineSvg`,!0),u||a(`Talk`,!0),d||a(`Term`,!0),(0,t.jsxs)(t.Fragment,{children:[`
`,(0,t.jsx)(c,{children:`Why a Radar: Details Part 1`}),`
`,(0,t.jsxs)(s,{children:[(0,t.jsxs)(i,{step:8,children:[(0,t.jsxs)(r.p,{children:[`A `,(0,t.jsx)(r.strong,{children:(0,t.jsx)(d,{id:`radiometer`,children:`radiometer`})}),` measures a brightness temperature — one number, summed through the entire column of atmosphere beneath it.`]}),(0,t.jsxs)(u,{char:`core2`,children:[`I can see `,(0,t.jsx)(r.em,{children:`that`}),` there is water down there. I cannot see whether it is at 2 km or at 10 km, whether it is frozen or melted, or where it changes from one to the other.`]})]}),(0,t.jsxs)(i,{tone:`a`,step:9,children:[(0,t.jsxs)(r.p,{children:[`A `,(0,t.jsx)(r.strong,{children:`radar`}),` transmits a pulse and times the echo. And timing is the whole trick:`]}),(0,t.jsx)(o,{children:`every echo arrives with its own [[hl:range]] attached
[[cm:…and range, from a satellite looking down, is height.]]`}),(0,t.jsxs)(r.p,{children:[`So a radar does not return a picture of a storm. It returns a `,(0,t.jsx)(r.strong,{children:`vertical slice through it`}),`, kilometre after kilometre along the orbit track.`]})]}),(0,t.jsx)(i,{tone:`d`,span:!0,step:10,children:(0,t.jsxs)(`figure`,{children:[(0,t.jsx)(l,{svg:n}),(0,t.jsx)(`figcaption`,{children:`Same storm, same moment. The radiometer compresses it; the radar resolves it.`})]})})]})]})}function i(e={}){let{wrapper:n}=e.components||{};return n?(0,t.jsx)(n,{...e,children:(0,t.jsx)(r,{...e})}):r(e)}function a(e,t){throw Error(`Expected `+(t?`component`:`object`)+" `"+e+"` to be defined: you likely forgot to import, pass, or provide it.")}export{i as default};