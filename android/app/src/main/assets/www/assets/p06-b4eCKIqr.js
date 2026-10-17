import{t as e}from"./jsx-runtime-BX5dh3L7.js";var t=e();function n(e){let n={code:`code`,p:`p`,strong:`strong`,...e.components},{Box:r,Calc:a,Grid:o,Header:s,Psst:c,Term:l}=n;return r||i(`Box`,!0),a||i(`Calc`,!0),o||i(`Grid`,!0),s||i(`Header`,!0),c||i(`Psst`,!0),l||i(`Term`,!0),(0,t.jsxs)(t.Fragment,{children:[`
`,(0,t.jsx)(s,{children:`Opening a Granule: Details Part 4`}),`
`,(0,t.jsxs)(o,{children:[(0,t.jsxs)(r,{tone:`a`,span:!0,step:14,children:[(0,t.jsxs)(n.p,{children:[`A Level-2 `,(0,t.jsx)(l,{id:`granule`,children:`granule`}),` is one orbit, in HDF5. Everything in this book is a few lines away:`]}),(0,t.jsx)(a,{code:!0,children:`[[cm:import h5py, numpy as np]]

f  = h5py.File(path, [[o:"r"]])
fs = f[[[o:"FS"]]]                               [[cm:# the full-swath group]]

lat   = fs[[[o:"Latitude"]]][:]                   [[cm:# (nscan, 49)]]
lon   = fs[[[o:"Longitude"]]][:]
rate  = fs[[[o:"SLV/precipRate"]]][:]             [[cm:# (nscan, 49, 176)]]
hgt   = fs[[[o:"PRE/height"]]][:]                 [[cm:# (nscan, 49, 176), metres]]
ptype = fs[[[o:"CSF/typePrecip"]]][:]             [[cm:# (nscan, 49)]]
cfb   = fs[[[o:"PRE/binClutterFreeBottom"]]][:]   [[cm:# (nscan, 49), 1-based bin numbers]]`})]}),(0,t.jsxs)(r,{step:15,children:[(0,t.jsxs)(n.p,{children:[`Note `,(0,t.jsx)(n.code,{children:`PRE/height`}),`. The file `,(0,t.jsxs)(n.strong,{children:[`gives you the height of every `,(0,t.jsx)(l,{id:`range-bin`,children:`range bin`})]}),`, already corrected for the slant path and the local zenith angle.`]}),(0,t.jsxs)(c,{children:[`Do not compute it yourself from bin numbers and 125 m. People do, and they get the `,(0,t.jsx)(l,{id:`swath`,children:`swath`}),` edge wrong.`]})]}),(0,t.jsxs)(r,{tone:`d`,step:16,children:[(0,t.jsxs)(n.p,{children:[`Before anything else, `,(0,t.jsx)(n.strong,{children:`print the shapes`}),`. Some fields in the dual-frequency product carry a trailing frequency axis of length 2 — Ku first, then Ka — and some do not:`]}),(0,t.jsx)(a,{code:!0,children:`for k in [[[o:"PRE/zFactorMeasured"]],
        [[o:"SLV/zFactorFinal"]],
        [[o:"SLV/paramDSD"]]]:
  print(k, fs[k].shape)`}),(0,t.jsx)(n.p,{children:`It costs one second and saves an afternoon.`})]})]})]})}function r(e={}){let{wrapper:r}=e.components||{};return r?(0,t.jsx)(r,{...e,children:(0,t.jsx)(n,{...e})}):n(e)}function i(e,t){throw Error(`Expected `+(t?`component`:`object`)+" `"+e+"` to be defined: you likely forgot to import, pass, or provide it.")}export{r as default};