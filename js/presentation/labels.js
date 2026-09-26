/**
 * CrochetCalc (PuntoPerfecto) - Select labels
 * Textos cortos para los desplegables, pensados para caber en pantallas de móvil.
 */

export function yarnOptionLabel(yarn) {
  return `#${yarn.cyc} · ${yarn.shortES}`;
}

export function hookOptionLabel(hook) {
  return `${hook.mm} mm · US ${hook.us.replace(/ \/ /g, '/')}`;
}
