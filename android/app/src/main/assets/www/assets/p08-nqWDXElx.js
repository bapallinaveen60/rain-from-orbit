import{t as e}from"./jsx-runtime-BX5dh3L7.js";var t=e();function n(e){let n={p:`p`,...e.components},{Box:r,Calc:a,Grid:o,Header:s,Splat:c,Talk:l,Term:u}=n;return r||i(`Box`,!0),a||i(`Calc`,!0),o||i(`Grid`,!0),s||i(`Header`,!0),c||i(`Splat`,!0),l||i(`Talk`,!0),u||i(`Term`,!0),(0,t.jsxs)(t.Fragment,{children:[`
`,(0,t.jsx)(s,{children:`A Curtain in Fifteen Lines: Details Part 6`}),`
`,(0,t.jsxs)(o,{children:[(0,t.jsxs)(r,{tone:`a`,span:!0,step:23,children:[(0,t.jsxs)(n.p,{children:[`This is the Chapter 3 scan curtain, from a real `,(0,t.jsx)(u,{id:`granule`,children:`granule`}),` — along-track this time rather than across:`]}),(0,t.jsx)(a,{code:!0,children:`[[cm:import matplotlib.pyplot as plt]]

s0, s1, ray = [[o:2000]], [[o:2120]], [[o:24]]          [[cm:# 120 scans, nadir ray]]

z   = fs[[[o:"SLV/zFactorFinal"]]][s0:s1, ray, :]       [[cm:# (120, 176) dBZ]]
hkm = fs[[[o:"PRE/height"]]][s0:s1, ray, :] / [[o:1000.0]]   [[cm:# (120, 176) km]]
cfb = fs[[[o:"PRE/binClutterFreeBottom"]]][s0:s1, ray]   [[cm:# bin numbers, 1-based]]

z = np.where(z < [[o:-1000]], np.nan, z)

scan  = np.arange(s0, s1)
clut  = np.array([hkm[i, cfb[i\\] - [[o:1]]\\] for i in range(len(cfb))])   [[cm:# bin → index]]

plt.pcolormesh(scan, hkm[[[o:0]]], z.T, vmin=[[o:15]], vmax=[[o:50]], shading=[[o:"nearest"]])
plt.plot(scan, clut, [[o:"w--"]], lw=[[o:1.5]])     [[cm:# the blind-layer ceiling]]
plt.ylim([[o:0]], [[o:15]]); plt.ylabel([[o:"height (km)"]]); plt.xlabel([[o:"scan"]])`})]}),(0,t.jsxs)(r,{tone:`c`,span:!0,step:24,children:[(0,t.jsx)(l,{char:`core`,children:`That dashed white line is the one to draw first, every time. Everything beneath it in my product is an assumption, not a measurement — and it is the part nearest the ground.`}),(0,t.jsx)(l,{char:`dot`,children:`Plot the line. Then decide whether your answer depends on what is under it.`}),(0,t.jsx)(c,{children:`SPLAT!!!`})]})]})]})}function r(e={}){let{wrapper:r}=e.components||{};return r?(0,t.jsx)(r,{...e,children:(0,t.jsx)(n,{...e})}):n(e)}function i(e,t){throw Error(`Expected `+(t?`component`:`object`)+" `"+e+"` to be defined: you likely forgot to import, pass, or provide it.")}export{r as default};