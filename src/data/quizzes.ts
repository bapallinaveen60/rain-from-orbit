// Chapter self-checks, migrated from "Rain from Orbit.html". In the source data the right
// answer is always listed first (c: 0); the Quiz component shuffles the display order.

export interface QuizItem {
  /** Question stem. */
  s: string
  /** Options, in source order. */
  o: string[]
  /** Index of the right option in `o`. */
  c: number
  /** Explanation shown after answering. */
  e: string
}

export const quizzes: Record<string, QuizItem[]> = {
  ch1: [
    {
      s: 'GPM flies a non-sun-synchronous orbit. What does that buy the mission?',
      o: [
        'It samples every local time of day at a given latitude over the course of a month, so the diurnal cycle of precipitation is resolved.',
        'It keeps the solar panels permanently illuminated, which simplifies the power budget.',
        'It holds the satellite over the tropics, where most precipitation falls.',
        'It reduces the fuel needed to maintain altitude against atmospheric drag.',
      ],
      c: 0,
      e: 'A sun-synchronous orbit crosses a given latitude at the same two local times forever, so it would be systematically blind to the daily cycle of convection — afternoon storms over land, nocturnal maxima offshore. The drifting crossing time is what lets GPM build an unbiased diurnal climatology.',
    },
    {
      s: "What is the Core Observatory's role for the rest of the constellation?",
      o: [
        'It is the calibration reference: its radar–radiometer pairs train the retrievals applied to partner radiometers that carry no radar.',
        "It relays the partner satellites' data to the ground through TDRS.",
        'It is the only satellite in the constellation that measures precipitation; the others measure water vapour.',
        "It fills the coverage gaps left by the partner satellites' narrower swaths.",
      ],
      c: 0,
      e: "The partner satellites — SSMIS, AMSR-2, MHS, ATMS — are passive radiometers flying their own missions. None has a radar. GPM's value is that it sees both the radiometer signal and the radar truth at the same time and place, which is what makes a uniform multi-satellite product like IMERG possible.",
    },
  ],
  ch2: [
    {
      s: 'Radar reflectivity weights the drop size distribution by roughly D⁶. Rainfall rate weights it by roughly which power?',
      o: [
        'D³·⁷ — drop volume times fall speed, and fall speed itself goes as about D⁰·⁷.',
        'D⁶ as well, which is why Z–R relations work so cleanly.',
        "D² — rain rate is governed by the drops' cross-sectional area.",
        'D⁹ — rain rate is far more sensitive to large drops than reflectivity is.',
      ],
      c: 0,
      e: "Volume contributes D³ and terminal fall speed about D⁰·⁷, so R ∝ roughly the 3.7th moment. The gap between that and the 6th moment is exactly the room in which a single-frequency radar's rain rate becomes ambiguous.",
    },
    {
      s: 'In the laboratory panel, locking Z and then raising Dm made the rain rate fall sharply. Why?',
      o: [
        'Holding Z fixed while increasing drop size forces the concentration Nw down steeply, and R depends on concentration far more than Z does at a given size.',
        'Larger drops fall more slowly, so they deliver less water per unit time.',
        'The gamma distribution becomes unphysical at large Dm and the model saturates.',
        'Attenuation grows with drop size, suppressing the retrieved rain rate.',
      ],
      c: 0,
      e: 'Z ∝ Nw·Dm⁷ and R ∝ Nw·Dm⁴·⁷ (for this μ). Holding Z constant means Nw must fall as Dm⁷; R then falls as Dm⁴·⁷⁻⁷ = Dm⁻²·³. Same echo, very different rain. No attenuation involved — this is the ambiguity in the clean, unattenuated signal.',
    },
  ],
  ch3: [
    {
      s: 'Why does the clutter-free bottom sit higher above the ground near the swath edge than at nadir?',
      o: [
        'At oblique incidence the surface return is spread across more range bins, because different parts of the footprint are at measurably different ranges.',
        'The atmosphere is optically thicker along a slant path, so the lowest bins are attenuated away.',
        'The antenna gain is lower at the scan edge, so the noise floor rises.',
        'The spacecraft is farther from the surface at the edge of the swath, degrading range resolution.',
      ],
      c: 0,
      e: 'A 5 km footprint viewed at 17° off nadir has a near edge and a far edge separated by well over a kilometre in slant range, so the bright surface echo smears over many bins — plus side-lobe returns. At nadir the whole footprint is at nearly the same range and the surface return is sharp.',
    },
    {
      s: 'What does the Solver do with the range bins below the clutter-free bottom?',
      o: [
        'It holds Ze constant at the value from the lowest trusted bin and carries that down to the surface.',
        'It discards the pixel entirely and writes a missing value for surface rain rate.',
        'It extrapolates the reflectivity gradient from the bins above, continuing the trend downward.',
        "It substitutes the GMI radiometer's estimate for the lowest layer.",
      ],
      c: 0,
      e: 'Constant Ze below the clutter-free bottom. That is a reasonable assumption for deep convection where the profile is already fairly uniform near the surface, and a much weaker one for shallow systems where the lowest kilometre is where the structure lives.',
    },
  ],
  ch4: [
    {
      s: 'What makes the Hitschfeld–Bordan solution unstable in heavy rain?',
      o: [
        'Its denominator contains the integrated attenuation and approaches zero, so any error in α or in calibration is amplified without bound.',
        'It assumes Rayleigh scattering, which fails once drops become comparable to the wavelength.',
        'It requires an independent PIA estimate, which the surface reference cannot supply over land.',
        'It integrates upward from the surface, so ground clutter contaminates every gate above.',
      ],
      c: 0,
      e: 'The bracket [1 − 0.2 ln10 · β ∫αZm^β ds] shrinks as attenuation accumulates. As it approaches zero the correction blows up, and a small bias in α — which is really a bias in the assumed DSD — becomes a catastrophic one. HB works where you do not need it and fails where you do.',
    },
    {
      s: 'How does the Surface Reference Technique estimate path-integrated attenuation?',
      o: [
        'By differencing the surface cross-section σ⁰ measured inside the rain against a rain-free reference at the same incidence angle and surface type.',
        'By comparing the Ku-band and Ka-band reflectivities at the lowest clutter-free bin.',
        'By integrating the retrieved specific attenuation from storm top to the surface.',
        'By using the GMI brightness temperature as an independent column constraint.',
      ],
      c: 0,
      e: 'The ground is a target of roughly known brightness. Whatever dimming you see relative to its rain-free value is what the rain took out, two ways. The whole difficulty is establishing the rain-free reference — hence the along-track, cross-track and climatological estimates combined by inverse variance.',
    },
  ],
  ch5: [
    {
      s: 'Why is the effective dual-frequency ratio sensitive to Dm but not to Nw?',
      o: [
        'Both effective reflectivities scale linearly with Nw, so the concentration cancels exactly when you take their ratio.',
        'Nw has no physical effect on backscatter; only drop size scatters radiation.',
        'The Ka-band channel is calibrated against Ku-band, which removes the concentration dependence.',
        'Nw cancels only in rain; in snow the DFR does depend on concentration.',
      ],
      c: 0,
      e: 'N(D) = Nw · n(D; Dm), so Ze at either frequency is Nw times a function of Dm alone. Taking 10log₁₀ of the ratio subtracts the Nw terms away. That separation — size from the ratio, number from the absolute level — is the entire dual-frequency idea.',
    },
    {
      s: 'The ATBD prefers backward retrieval over forward retrieval. Why?',
      o: [
        'It generally gives numerically stable and unique solutions, where the forward method can have two solutions at each range bin.',
        'It avoids needing a PIA estimate, which is unreliable over land.',
        'It is faster, because the attenuation integral does not have to be recomputed at each gate.',
        'It does not require knowing the storm top, which is poorly determined for shallow systems.',
      ],
      c: 0,
      e: 'Backward retrieval starts from the surface with an independent PIA from the SRT, which anchors the solution. Its costs are real — it depends on the SRT being right and on an assumption about the profile inside the clutter region — but the forward method inherits both the HB instability and the DFR double-root at every gate.',
    },
  ],
  ch6: [
    {
      s: 'What physically produces the bright band?',
      o: [
        "Melting snow aggregates acquire a water coating — and water's dielectric constant — while still holding their large, loose geometry, before they collapse and accelerate into raindrops.",
        'Updraughts concentrate hydrometeors into a thin layer just below the freezing level.',
        'The radar beam refracts at the 0 °C level, focusing energy into a narrow range of heights.',
        'Supercooled water droplets freeze suddenly at 0 °C, releasing latent heat that enhances backscatter.',
      ],
      c: 0,
      e: "A wet, large aggregate is close to ideal as a radar target: water's |K|² is roughly five times ice's, and the particle has not yet shrunk. Once melting completes, the particle collapses to a much smaller raindrop and speeds up — fewer, smaller scatterers per volume — and the reflectivity falls back. Hence a band, not a step.",
    },
    {
      s: 'Why does the DFRm classification method key on the slope of DFRm rather than its absolute value?',
      o: [
        'Slope is insensitive to a calibration offset between the two radars, which would shift absolute DFRm but not its vertical gradient.',
        'Absolute DFRm is unavailable in the outer swath, where only Ku-band observes.',
        'The slope is proportional to rain rate, so it converts directly to a precipitation estimate.',
        'Absolute DFRm saturates above 10 dB, so it carries no information in heavy rain.',
      ],
      c: 0,
      e: 'Any fixed bias between KuPR and KaPR calibration adds a constant to DFRm at every height. Differentiating with height removes it. The ATBD states this explicitly as the reason for using the slope in the snow index as well.',
    },
  ],
  ch7: [
    {
      s: 'Why must the Classification module run before the DSD module?',
      o: [
        'The DSD module chooses particle densities, dielectric constants, fall speeds and the R–Dm relation according to rain type and bright-band position, which CSF determines.',
        'CSF computes the path-integrated attenuation that DSD needs for its scattering tables.',
        'DSD can only process pixels that CSF has already identified as containing precipitation.',
        'The order is arbitrary; the modules are independent and can run in any sequence.',
      ],
      c: 0,
      e: "The two R–Dm relations differ substantially between stratiform and convective, and the node placement A–E that sets each bin's phase depends on where the bright band is. Get the type wrong and the whole microphysical parameterisation for that ray is wrong.",
    },
    {
      s: 'What is the parameter ε doing in the Solver?',
      o: [
        'It adjusts the R–Dm (equivalently k–Ze) relation, and the Solver sweeps it from 0.2 to 5.0 to find the value that best reconciles the DSD prior, the SRT PIA and the reflectivity residuals.',
        'It is the fractional error in the radar calibration constant, estimated once per orbit.',
        'It is the shape parameter μ of the gamma distribution, retrieved at each range bin.',
        'It scales the non-precipitation attenuation correction supplied by the VER module.',
      ],
      c: 0,
      e: "ε is the knob that lets the algorithm depart from its climatological DSD assumption when the observations demand it. Because it is selected by a cost function rather than computed, the retrieved ε field is a useful diagnostic: a systematic departure from unity over a region is telling you the prior does not fit that region's microphysics.",
    },
  ],
  ch8: [
    {
      s: 'Why is a single fixed Z–R relation especially poor over the Western Ghats during the monsoon?',
      o: [
        'Dm shifts from about 1.3 mm in wet spells to about 0.9 mm in dry spells, so the same reflectivity corresponds to substantially different rain rates in the two phases.',
        "Orographic rain is too heavy for the radar's dynamic range, saturating the receiver.",
        'The 65° inclination means India is sampled only at the extreme edge of the swath.',
        'Ground clutter from the mountains contaminates the entire profile, not just the lowest bins.',
      ],
      c: 0,
      e: 'The published disdrometer record shows the distribution reorganising between active and break phases — collision–coalescence producing larger drops in wet spells, evaporation and breakup producing many small ones in dry spells. A relation fitted to one phase will be biased in the other, over the same mountains in the same season.',
    },
    {
      s: 'What is the main geometric problem for shallow orographic rain over the Ghats?',
      o: [
        'Much of the profile falls inside the clutter blind layer, so the layer actually producing the rainfall is extrapolated rather than observed.',
        'The swath is too narrow to cover the escarpment in a single overpass.',
        "Shallow rain falls below the DPR's minimum detectable reflectivity at both frequencies.",
        'The bright band sits below the terrain, so classification always returns "other".',
      ],
      c: 0,
      e: 'A warm orographic system can be only two or three kilometres deep, while the clutter-free bottom sits a few hundred metres up at nadir and over a kilometre up near the swath edge — higher still over rough terrain. The Solver then holds Ze constant through precisely the layer you wanted measured.',
    },
  ],
}
